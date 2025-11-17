"use client";

import { useState, useMemo } from "react";
import { TrendingUp, BarChart3, Package, DollarSign, TrendingDown } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value);
};

export function Chart({
  chartConfig,
  chartData,
  handleTimeRange,
}: {
  chartConfig: ChartConfig;
  chartData: any[];
  handleTimeRange: (date: string) => void;
}) {
  const [timeRange, setTimeRange] = useState("3months");

  const handleSelectDay = (value: string) => {
    setTimeRange(value);
    handleTimeRange(value);
  };

  // Calcular estadísticas
  const stats = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;

    const totalRevenue = chartData.reduce((sum, item) => sum + (item.totalPriceCurrent || 0), 0);
    const totalUnits = chartData.reduce((sum, item) => sum + (item.totalStockSold || 0), 0);
    const topProduct = chartData.length > 0 ? chartData[0] : null;
    const averagePerProduct = totalRevenue / chartData.length;

    return {
      totalRevenue,
      totalUnits,
      topProduct,
      averagePerProduct,
      productsCount: chartData.length,
    };
  }, [chartData]);

  const timeRangeLabels: Record<string, string> = {
    "3months": "últimos 3 meses",
    "1month": "últimos 30 días",
    "7days": "últimos 7 días",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Productos Más Vendidos</CardTitle>
            <CardDescription className="mt-1">
              Análisis de ventas por producto
            </CardDescription>
          </div>
          {/* Selector de rango de tiempo */}
          <Select value={timeRange} onValueChange={handleSelectDay}>
            <SelectTrigger
              className="w-[160px] rounded-lg"
              aria-label="Seleccionar período"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="3months" className="rounded-lg">
                Últimos 3 meses
              </SelectItem>
              <SelectItem value="1month" className="rounded-lg">
                Últimos 30 días
              </SelectItem>
              <SelectItem value="7days" className="rounded-lg">
                Últimos 7 días
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {chartData && chartData.length > 0 ? (
          <>
            {/* Mini estadísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-600 text-xs mb-1">
                  <DollarSign className="h-3 w-3" />
                  <span className="font-medium">Ingresos Totales</span>
                </div>
                <p className="text-lg font-bold text-blue-700">
                  {formatCurrency(stats?.totalRevenue || 0)}
                </p>
              </div>

              <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-600 text-xs mb-1">
                  <Package className="h-3 w-3" />
                  <span className="font-medium">Unidades Vendidas</span>
                </div>
                <p className="text-lg font-bold text-green-700">
                  {stats?.totalUnits || 0}
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                <div className="flex items-center gap-2 text-purple-600 text-xs mb-1">
                  <BarChart3 className="h-3 w-3" />
                  <span className="font-medium">Productos</span>
                </div>
                <p className="text-lg font-bold text-purple-700">
                  {stats?.productsCount || 0}
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                <div className="flex items-center gap-2 text-orange-600 text-xs mb-1">
                  <TrendingUp className="h-3 w-3" />
                  <span className="font-medium">Promedio/Prod</span>
                </div>
                <p className="text-lg font-bold text-orange-700">
                  {formatCurrency(stats?.averagePerProduct || 0)}
                </p>
              </div>
            </div>

            {/* Gráfico */}
            <div className="mt-4">
              <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData.slice(0, 10)}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fill: "#6b7280", fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) =>
                        new Intl.NumberFormat("es-AR", {
                          notation: "compact",
                          compactDisplay: "short",
                        }).format(value)
                      }
                    />
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 space-y-1">
                            <p className="font-semibold text-sm text-gray-900">{data.name}</p>
                            <div className="flex items-center gap-2 text-xs">
                              <DollarSign className="h-3 w-3 text-blue-600" />
                              <span className="text-gray-600">Ingresos:</span>
                              <span className="font-bold text-blue-600">
                                {formatCurrency(data.totalPriceCurrent)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Package className="h-3 w-3 text-green-600" />
                              <span className="text-gray-600">Unidades:</span>
                              <span className="font-bold text-green-600">
                                {data.totalStockSold || 0}
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="totalPriceCurrent"
                      fill="#3b82f6"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={60}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-80 text-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center">
              <BarChart3 className="h-10 w-10 text-blue-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                No hay datos de ventas
              </h3>
              <p className="text-sm text-gray-500 max-w-md">
                No se encontraron ventas en el período seleccionado ({timeRangeLabels[timeRange]}).
                Intenta cambiar el rango de tiempo o realiza algunas ventas.
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {stats && stats.topProduct && (
        <CardFooter className="border-t pt-4">
          <div className="flex items-center gap-2 text-sm w-full">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <div className="flex-1">
              <span className="text-gray-600">Producto más vendido: </span>
              <span className="font-semibold text-gray-900">{stats.topProduct.name}</span>
              <span className="text-gray-500"> con {formatCurrency(stats.topProduct.totalPriceCurrent)} en ventas</span>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
