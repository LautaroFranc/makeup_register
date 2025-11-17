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
      <CardHeader className="pb-3">
        {/* Header responsive: columna en móvil, fila en desktop */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg sm:text-xl">Productos Más Vendidos</CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              Análisis de ventas por producto
            </CardDescription>
          </div>
          {/* Selector de rango de tiempo */}
          <Select value={timeRange} onValueChange={handleSelectDay}>
            <SelectTrigger
              className="w-full sm:w-[160px] rounded-lg text-sm"
              aria-label="Seleccionar período"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="3months" className="rounded-lg text-sm">
                Últimos 3 meses
              </SelectItem>
              <SelectItem value="1month" className="rounded-lg text-sm">
                Últimos 30 días
              </SelectItem>
              <SelectItem value="7days" className="rounded-lg text-sm">
                Últimos 7 días
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="px-3 sm:px-6">
        {chartData && chartData.length > 0 ? (
          <>
            {/* Mini estadísticas - Grid optimizado para móvil */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 sm:p-3">
                <div className="flex items-center gap-1.5 sm:gap-2 text-blue-600 text-[10px] sm:text-xs mb-1">
                  <DollarSign className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                  <span className="font-medium leading-tight">Ingresos</span>
                </div>
                <p className="text-sm sm:text-lg font-bold text-blue-700 truncate">
                  {formatCurrency(stats?.totalRevenue || 0)}
                </p>
              </div>

              <div className="bg-green-50 border border-green-100 rounded-lg p-2.5 sm:p-3">
                <div className="flex items-center gap-1.5 sm:gap-2 text-green-600 text-[10px] sm:text-xs mb-1">
                  <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                  <span className="font-medium leading-tight">Unidades</span>
                </div>
                <p className="text-sm sm:text-lg font-bold text-green-700">
                  {stats?.totalUnits || 0}
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-100 rounded-lg p-2.5 sm:p-3">
                <div className="flex items-center gap-1.5 sm:gap-2 text-purple-600 text-[10px] sm:text-xs mb-1">
                  <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                  <span className="font-medium leading-tight">Productos</span>
                </div>
                <p className="text-sm sm:text-lg font-bold text-purple-700">
                  {stats?.productsCount || 0}
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-lg p-2.5 sm:p-3">
                <div className="flex items-center gap-1.5 sm:gap-2 text-orange-600 text-[10px] sm:text-xs mb-1">
                  <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                  <span className="font-medium leading-tight">Promedio</span>
                </div>
                <p className="text-sm sm:text-lg font-bold text-orange-700 truncate">
                  {formatCurrency(stats?.averagePerProduct || 0)}
                </p>
              </div>
            </div>

            {/* Gráfico con altura ajustada para móvil */}
            <div className="mt-2 sm:mt-4 -mx-3 sm:mx-0">
              <ChartContainer config={chartConfig} className="min-h-[280px] sm:min-h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData.slice(0, 8)}
                    margin={{
                      top: 10,
                      right: 10,
                      left: 0,
                      bottom: 50
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fill: "#6b7280", fontSize: 10 }}
                      tickLine={false}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={35}
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
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 sm:p-3 space-y-1 max-w-[200px]">
                            <p className="font-semibold text-xs sm:text-sm text-gray-900 truncate">{data.name}</p>
                            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                              <DollarSign className="h-3 w-3 text-blue-600 flex-shrink-0" />
                              <span className="text-gray-600">Ingresos:</span>
                              <span className="font-bold text-blue-600 truncate">
                                {formatCurrency(data.totalPriceCurrent)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                              <Package className="h-3 w-3 text-green-600 flex-shrink-0" />
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
                      maxBarSize={50}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-60 sm:h-80 text-center space-y-3 sm:space-y-4 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center">
              <BarChart3 className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500" />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <h3 className="text-base sm:text-xl font-semibold text-gray-900">
                No hay datos de ventas
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-md px-2">
                No se encontraron ventas en el período seleccionado ({timeRangeLabels[timeRange]}).
                Intenta cambiar el rango de tiempo o realiza algunas ventas.
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {stats && stats.topProduct && (
        <CardFooter className="border-t pt-3 sm:pt-4 px-3 sm:px-6">
          <div className="flex items-start sm:items-center gap-2 text-xs sm:text-sm w-full">
            <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1 min-w-0">
              <span className="text-gray-600">Top: </span>
              <span className="font-semibold text-gray-900">{stats.topProduct.name}</span>
              <span className="text-gray-500 block sm:inline sm:ml-1">
                {formatCurrency(stats.topProduct.totalPriceCurrent)}
              </span>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
