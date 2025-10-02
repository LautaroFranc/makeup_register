"use client";

import { ChartConfig } from "@/components/ui/chart";
import { Chart } from "@/components/Chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatToARS } from "@/lib/utils";
import { useFetch } from "@/hooks/useFetch";
import { useEffect, useState } from "react";
import PurchaseTable from "@/components/PurchaseTable/PurchaseTable";
import {
  History,
  TrendingUp,
  Package,
  DollarSign,
  ShoppingCart,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  BarChart3,
  Activity,
} from "lucide-react";
import Link from "next/link";

interface ChartOptions {
  product: string;
  totalSales: number;
}

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Mobile",
    color: "hsl(var(--chart-2))",
  },
  label: {
    color: "hsl(var(--background))",
  },
} satisfies ChartConfig;

export default function Home() {
  const [purchase, setPurchase] = useState<Purchase[]>([]);
  const [chart, setChart] = useState<ChartOptions[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { data: purchaseDate, fetchData: fetchPurchase } =
    useFetch<Purchase[]>();
  const { data: dataChart, fetchData: fetchChart } = useFetch<{
    productComparison: ChartOptions[];
  }>();
  const {
    data: saleSummary,
    fetchData: fetchSaleSummary,
    loading,
  } = useFetch<any>();

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetchPurchase(`/api/purchase`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    fetchChart(`/api/chart?filter=3months`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    fetchSaleSummary(`/api/saleProduct/summary`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }, []);

  useEffect(() => {
    if (purchaseDate?.length) {
      setPurchase(purchaseDate);
    }
  }, [purchaseDate]);

  useEffect(() => {
    if (dataChart) {
      const data = dataChart?.productComparison;
      setChart(data || []);
    }
  }, [dataChart]);

  const handleTimeRange = (date: string) => {
    const token = localStorage.getItem("token");
    fetchChart(`/api/chart?filter=${date}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setChart([]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const token = localStorage.getItem("token");

    try {
      await Promise.all([
        fetchPurchase(`/api/purchase`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetchChart(`/api/chart?filter=3months`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetchSaleSummary(`/api/saleProduct/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Calcular métricas adicionales
  const totalRevenue = saleSummary?.totalRevenue || 0;
  const totalSales = saleSummary?.totalSales || 0;
  const totalStock = saleSummary?.totalStock || 0;
  const totalProducts = saleSummary?.totalProducts || 0;
  const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

  // Obtener ventas de hoy
  const todaySales = purchase.filter((p) => {
    const saleDate = new Date(p.createdAt);
    const today = new Date();
    return saleDate.toDateString() === today.toDateString();
  });

  const todayRevenue = todaySales.reduce(
    (sum, sale) => sum + sale.totalPrice,
    0
  );

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 space-y-6">
      {/* Header con acciones rápidas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Resumen de tu negocio</p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>

          <Link href="/products/createProduct">
            <Button className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Nuevo Producto
            </Button>
          </Link>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ingresos Totales */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Ingresos Totales
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatToARS(totalRevenue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalSales} ventas realizadas
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-50 rounded-full -translate-y-10 translate-x-10"></div>
          </CardContent>
        </Card>

        {/* Stock Total */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stock Total</p>
                <p className="text-2xl font-bold text-blue-600">
                  {totalStock.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalProducts} productos únicos
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full -translate-y-10 translate-x-10"></div>
          </CardContent>
        </Card>

        {/* Ventas Hoy */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ventas Hoy</p>
                <p className="text-2xl font-bold text-purple-600">
                  {todaySales.length}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatToARS(todayRevenue)} en ingresos
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-50 rounded-full -translate-y-10 translate-x-10"></div>
          </CardContent>
        </Card>

        {/* Valor Promedio */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Ticket Promedio
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatToARS(averageOrderValue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Por transacción</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-50 rounded-full -translate-y-10 translate-x-10"></div>
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de ventas */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <CardTitle>Análisis de Ventas</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                Últimos 3 meses
              </Badge>
            </CardHeader>
            <CardContent>
              <Chart
                chartConfig={chartConfig}
                chartData={chart}
                handleTimeRange={handleTimeRange}
              />
            </CardContent>
          </Card>
        </div>

        {/* Acciones rápidas */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Acciones Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/products/createProduct" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Package className="h-4 w-4" />
                  Agregar Producto
                </Button>
              </Link>

              <Link href="/products/table" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Ver Productos
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Resumen de rendimiento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Rendimiento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Productos en Stock
                </span>
                <Badge variant="secondary">{totalProducts}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Ventas Totales</span>
                <Badge variant="secondary">{totalSales}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Stock Disponible</span>
                <Badge variant="secondary">{totalStock}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Ventas Hoy</span>
                <Badge
                  variant={todaySales.length > 0 ? "default" : "secondary"}
                >
                  {todaySales.length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Historial de ventas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-gray-600" />
            <CardTitle>Historial de Ventas Recientes</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {purchase.length} ventas
          </Badge>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex items-center gap-2 text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Cargando ventas...</span>
              </div>
            </div>
          ) : purchase.length > 0 ? (
            <PurchaseTable purchases={purchase} />
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay ventas registradas
              </h3>
              <p className="text-gray-500 mb-4">
                Comienza registrando tus primeras ventas
              </p>
              <Link href="/products/table">
                <Button>Ver Productos</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
