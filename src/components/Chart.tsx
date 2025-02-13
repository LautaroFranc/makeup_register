"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
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
              dataKey="product"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              hide
            />
            <XAxis dataKey="totalSales" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Bar dataKey="totalSales" fill="var(--color-desktop)" radius={4}>
              <LabelList
                dataKey="product"
                position="insideLeft"
                offset={8}
                className="fill-[--color-label]"
                fontSize={12}
              />
              <LabelList
                dataKey="totalSales"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium leading-none">
              Tendencia al alza del 5,2% este mes{" "}
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              Mostrando el total de visitantes para el rango seleccionado
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
