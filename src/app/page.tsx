"use client";

import { ChartConfig } from "@/components/ui/chart";
import { Chart } from "@/components/Chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatToARS } from "@/lib/utils";
import { useFetch } from "@/hooks/useFetch";
import { useEffect, useState } from "react";
import PurchaseTable from "@/components/PurchaseTable/PurchaseTable";
import { History } from "lucide-react";

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
  const { data: purchaseDate, fetchData: fetchPurchase } =
    useFetch<Purchase[]>();
  const { data: dataChart, fetchData: fetchChart } = useFetch<ChartOptions[]>();
  const { data: saleSummary, fetchData: fetchSaleSummary } = useFetch<ChartOptions[]>();

  useEffect(() => {
    fetchPurchase(`http://localhost:3000/api/purchase`);
    fetchChart(`http://localhost:3000/api/chart?filter=3months`);
    fetchSaleSummary(`http://localhost:3000/api/saleProduct/summary`);
  }, []);
  useEffect(() => {
    if (purchaseDate?.length) {
      setPurchase(purchaseDate);
    }
  }, [purchaseDate]);
  useEffect(() => {
    if (dataChart?.length) {
      setChart(dataChart);
    }
  }, [dataChart]);
  const handleTimeRange = (date: string) => {
    fetchChart(`http://localhost:3000/api/chart?filter=${date}`);
    setChart([]);
  };
  return (
    <div className="grid gap-1 md:grid-cols-2 m-4">
      <div className="grid gap-3 md:grid-cols-3 m-4">
        {[
          {
            title: "Ganancias",
            value:3 ,
            color: "green-600",
            type: "number",
          },
          {
            title: "Total Costo",
            value: 44,
            color: "red-600",
            type: "number",
          },
          {
            title: "Total Stock",
            value: saleSummary?.totalStock,
            color: "black",
            type: "text",
          },
        ].map(({ title, value, color, type }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold text-${color}`}>
                {type === "number" ? formatToARS(value) : value}
              </p>
            </CardContent>
          </Card>
        ))}
        <div className="md:col-span-3">
          <Chart
            chartConfig={chartConfig}
            chartData={chart}
            handleTimeRange={handleTimeRange}
          />
        </div>
      </div>
      <Card className="md:col-span-1 m-4">
        <div className="flex items-center">
          <span className="flex m-4 font-semibold">Historial</span>
          <History className="text-center" />
        </div>
        <PurchaseTable purchases={purchase} />
      </Card>
    </div>
  );
}
