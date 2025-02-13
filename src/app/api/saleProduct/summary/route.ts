import { NextResponse } from "next/server";
import Product from "@/models/Product";
import SaleProduct from "@/models/SaleProduct";

interface SaleStats {
  totalStockSold: number;
  totalRevenue: number;
  totalCost: number;
}

interface TrendResponse {
  totalStock: number;
  currentMonthSales: SaleStats;
  previousMonthSales: SaleStats;
  salesTrendPercentage: number;
  revenueTrendPercentage: number;
  costTrendPercentage: number;
  productsSold: {
    idProduct: string;
    name: string;
    totalStockSold: number;
    totalRevenue: number;
  }[];
}

export async function GET() {
  try {
    const now = new Date();
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

    // Obtener total de stock actual
    const allProducts = await Product.find();
    const totalStock = allProducts.reduce(
      (acc, product) => acc + product.stock,
      0
    );

    // Función para calcular ventas
    const getSalesStats = async (
      startDate: Date,
      endDate: Date
    ): Promise<SaleStats> => {
      const sales = await SaleProduct.find({
        createdAt: { $gte: startDate, $lt: endDate },
      });

      let totalStockSold = 0;
      let totalRevenue = 0;
      let totalCost = 0;

      for (const sale of sales) {
        const product = allProducts.find(
          (p:any) => p._id.toString() === sale.idProduct.toString()
        );
        if (product) {
          const revenue = Number(sale.sellPrice) * sale.stock;
          const cost = Number(product.buyPrice) * sale.stock;
          totalStockSold += sale.stock;
          totalRevenue += revenue;
          totalCost += cost;
        }
      }

      return { totalStockSold, totalRevenue, totalCost };
    };

    // Calcular ventas del mes actual y anterior
    const currentMonthSales = await getSalesStats(firstDayCurrentMonth, now);
    const previousMonthSales = await getSalesStats(
      firstDayPreviousMonth,
      firstDayCurrentMonth
    );

    // Calcular tendencias de ventas, ingresos y costos
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const salesTrendPercentage = calculateTrend(
      currentMonthSales.totalStockSold,
      previousMonthSales.totalStockSold
    );
    const revenueTrendPercentage = calculateTrend(
      currentMonthSales.totalRevenue,
      previousMonthSales.totalRevenue
    );
    const costTrendPercentage = calculateTrend(
      currentMonthSales.totalCost,
      previousMonthSales.totalCost
    );

    // Obtener productos vendidos este mes
    const soldProducts = await SaleProduct.find({
      createdAt: { $gte: firstDayCurrentMonth, $lt: now },
    });

    const productSalesMap = new Map<
      string,
      { name: string; totalStockSold: number; totalRevenue: number }
    >();

    for (const sale of soldProducts) {
      const product = allProducts.find(
        (p:any) => p._id.toString() === sale.idProduct.toString()
      );
      if (product) {
        if (!productSalesMap.has(sale.idProduct.toString())) {
          productSalesMap.set(sale.idProduct.toString(), {
            name: product.name,
            totalStockSold: 0,
            totalRevenue: 0,
          });
        }
        const productData = productSalesMap.get(sale.idProduct.toString())!;
        productData.totalStockSold += sale.stock;
        productData.totalRevenue += Number(sale.sellPrice) * sale.stock;
      }
    }

    const productsSold = Array.from(productSalesMap, ([idProduct, data]) => ({
      idProduct,
      name: data.name,
      totalStockSold: data.totalStockSold,
      totalRevenue: data.totalRevenue,
    }));

    // Respuesta final
    const response: TrendResponse = {
      totalStock,
      currentMonthSales,
      previousMonthSales,
      salesTrendPercentage,
      revenueTrendPercentage,
      costTrendPercentage,
      productsSold,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
