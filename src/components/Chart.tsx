"use client";

import { useEffect, useState } from "react";
import { TrendingUp, BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
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

export function Chart({
  chartConfig,
  chartData,
  handleTimeRange,
}: {
  chartConfig: ChartConfig;
  chartData: { product: string; totalSales: number }[];
  handleTimeRange: (date: string) => void;
}) {
  const [timeRange, setTimeRange] = useState("3months");
  const handleSelectDay = (value: string) => {
    setTimeRange(value);
    handleTimeRange(value);
  };
  console.log(chartData);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalle visual</CardTitle>
        <CardDescription>productos mas vendidos</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Selector de rango de tiempo */}
        <Select value={timeRange} onValueChange={handleSelectDay}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Last 3 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="3months" className="rounded-lg">
              últimos 3 meses
            </SelectItem>
            <SelectItem value="1month" className="rounded-lg">
              últimos 30 días
            </SelectItem>
            <SelectItem value="7days" className="rounded-lg">
              últimos 7 días
            </SelectItem>
          </SelectContent>
        </Select>

        {chartData && chartData.length > 0 ? (
          <ChartContainer config={chartConfig}>
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{
                right: 16,
              }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                hide
              />
              <XAxis dataKey="totalPriceCurrent" type="number" hide />
              <ChartTooltip
                cursor={true}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Bar
                dataKey="totalPriceCurrent"
                fill="var(--color-desktop)"
                radius={4}
              >
                <LabelList
                  dataKey="name"
                  position="insideLeft"
                  offset={8}
                  className="fill-[--color-label]"
                  fontSize={12}
                />
                <LabelList
                  dataKey="totalPriceCurrent"
                  position="right"
                  offset={8}
                  className="fill-foreground"
                  fontSize={12}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">
                No hay datos de ventas
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                No se encontraron ventas en el período seleccionado. Intenta
                cambiar el rango de tiempo o realiza algunas ventas.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
