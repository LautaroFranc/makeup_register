"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { ArrowDownToLine, ShoppingCart, Activity, AlertCircle, RefreshCw } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { Button } from "@/components/ui/button";

interface AbandonedCart {
  _id: string;
  customerEmail?: string;
  customerPhone?: string;
  products: { productId: string; quantity: number; price: number }[];
  totalAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface AnalyticsStats {
  totalProductViews: number;
  cartsCreated: number;
  abandoned: number;
  conversionRate: string;
  funnelData: { name: string; value: number }[];
  cartStatusData: { name: string; value: number; color: string }[];
  recentAbandoned: AbandonedCart[];
}

const EMPTY_STATS: AnalyticsStats = {
  totalProductViews: 0,
  cartsCreated: 0,
  abandoned: 0,
  conversionRate: "0.0",
  funnelData: [],
  cartStatusData: [],
  recentAbandoned: [],
};

export default function AnalyticsDashboard() {
  const { data, error, fetchData, loading } = useFetch<{ stats: AnalyticsStats }>();
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    const token = localStorage.getItem("token");
    if (token) {
      await fetchData(`/api/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = data?.stats ?? EMPTY_STATS;
  const isBusy = loading || refreshing;
  const hasFunnelData = stats.funnelData.some(stage => stage.value > 0);
  const hasCartData = stats.cartStatusData.some(slice => slice.value > 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analíticas Avanzadas</h1>
          <p className="text-gray-500 mt-1">Monitorea el comportamiento real de tus clientes y ventas.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadData} 
          disabled={isBusy}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isBusy ? "animate-spin" : ""}`} />
          Actualizar Datos
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">No se pudieron cargar las analíticas</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Visitas a Productos</p>
              <h3 className="text-2xl font-bold">{stats.totalProductViews}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-full text-purple-600">
              <ShoppingCart size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Carritos Creados</p>
              <h3 className="text-2xl font-bold">{stats.cartsCreated}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-full text-red-600">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Abandonos en Pago</p>
              <h3 className="text-2xl font-bold">{stats.abandoned}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-full text-green-600">
              <ArrowDownToLine size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Tasa de Conversión</p>
              <h3 className="text-2xl font-bold">{stats.conversionRate}%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Embudo de Ventas (Funnel)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isBusy ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                Cargando datos...
              </div>
            ) : hasFunnelData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                Aún no hay suficientes datos para el embudo
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado de los Carritos</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {isBusy ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                Cargando datos...
              </div>
            ) : hasCartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.cartStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.cartStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                Aún no hay carritos registrados
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Últimos Carritos Abandonados (Para recuperar)</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentAbandoned.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No hay carritos abandonados recientemente.</p>
              <p className="text-sm mt-2">¡Esa es una buena noticia!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.recentAbandoned.map((cart) => (
                <div key={cart._id} className="flex justify-between items-center p-4 border rounded-md">
                  <div>
                    <p className="font-medium text-gray-900">
                      Carrito Abandonado hace {Math.floor((Date.now() - new Date(cart.updatedAt).getTime()) / (1000 * 60 * 60))} hrs
                    </p>
                    <p className="text-sm text-gray-500">
                      {cart.products?.length || 0} productos guardados 
                      {cart.customerEmail ? ` • ${cart.customerEmail}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${cart.totalAmount}</p>
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">Abandonado</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
