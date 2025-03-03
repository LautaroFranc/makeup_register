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

  return (
    <div className="grid gap-1 md:grid-cols-2 m-4">
      <div className="grid gap-3 md:grid-cols-3 m-4">
        {[
          {
            title: "Total Stock",
            value: saleSummary?.totalStock || 0,
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
          <span className="flex m-4 font-semibold">Historial de ventas</span>
          <History className="text-center" />
        </div>
        <PurchaseTable purchases={purchase} />
        {!purchase.length && !loading ? (
          <div className="flex justify-center text-center text-gray-500">
            <span className="mt-4 text-center text-gray-500">
              sin ventas registradas
            </span>
          </div>
        ) : null}
        {loading ? (
          <div role="status" className="flex justify-center m-36">
            <svg
              aria-hidden="true"
              className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-black"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="currentColor"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentFill"
              />
            </svg>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
