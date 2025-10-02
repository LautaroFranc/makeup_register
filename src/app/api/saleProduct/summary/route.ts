import { NextRequest, NextResponse } from "next/server";
import Product from "@/models/Product";
import SaleProduct from "@/models/SaleProduct";
import { authMiddleware } from "../../middleware";

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

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck; // Verifica autenticación

    const userId = (await authCheck.json()).user._id; // Extraer ID del usuario autenticado
    // Obtener total de stock actual
    const allProducts = await Product.find({ user: userId });
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
        user: userId,
        createdAt: { $gte: startDate, $lt: endDate },
      });

      let totalStockSold = 0;
      let totalRevenue = 0;
      let totalCost = 0;

      for (const sale of sales) {
        const product = allProducts.find(
          (p: any) => p._id.toString() === sale.idProduct.toString()
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

    // Obtener productos vendidos este mes (solo del usuario logueado)
    const soldProducts = await SaleProduct.find({
      user: userId,
      createdAt: { $gte: firstDayCurrentMonth, $lt: now },
    });

    const productSalesMap = new Map<
      string,
      { name: string; totalStockSold: number; totalRevenue: number }
    >();

    for (const sale of soldProducts) {
      const product = allProducts.find(
        (p: any) => p._id.toString() === sale.idProduct.toString()
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
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
