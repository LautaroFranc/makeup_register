import { NextApiRequest, NextApiResponse } from "next";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import SaleProduct from "@/models/SaleProduct";
import Product from "@/models/Product"; // Asegúrate de tener este modelo

interface Sale {
  idProduct: string;
  sellPrice: number;
  stock: number;
  createdAt: Date;
}
interface AggregatedSale {
  idProduct: string;
  name?: string;
  totalPrice: number;
  totalStockSold: number;
}

export async function GET(req: Request) {
  try {
    const now = new Date();
    const searchParams = new URL(req.url).searchParams;
    const filter = searchParams.get("filter");

    let startDate: Date, previousStartDate: Date, previousEndDate: Date;

    switch (filter) {
      case "3months":
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth() - 3, 0);
        break;
      case "1month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0);
        break;
      case "7days":
        startDate = new Date();
        startDate.setDate(now.getDate() - 7);
        previousStartDate = new Date();
        previousStartDate.setDate(now.getDate() - 14);
        previousEndDate = new Date();
        previousEndDate.setDate(now.getDate() - 7);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
    }

    // Obtener ventas del período actual y anterior
    const [salesCurrent, salesPrevious]: [any[], any[]] = await Promise.all([
      SaleProduct.find({ createdAt: { $gte: startDate, $lte: now } }),
      SaleProduct.find({ createdAt: { $gte: previousStartDate, $lte: previousEndDate } }),
    ]);

    if (!salesCurrent.length) {
      return NextResponse.json(
        { success: false, error: { message: "No sales found in this period" } },
        { status: 404 }
      );
    }

    // Función para calcular ventas agregadas por producto
    const aggregateSales = async (sales: Sale[]) => {
      const result = await Promise.all(
        sales.map(async (sale) => {
          const product = await Product.findOne({ _id: sale.idProduct });
          return {
            idProduct: sale.idProduct,
            name: product?.name,
            totalPrice: Number(sale.sellPrice) * sale.stock,
            totalStockSold: sale.stock,
          };
        })
      );

      return result.reduce((acc: AggregatedSale[], curr: AggregatedSale) => {
        const existing = acc.find(
          (item) => item.idProduct.toString() === curr.idProduct.toString()
        );

        if (existing) {
          existing.totalPrice += curr.totalPrice;
          existing.totalStockSold += curr.totalStockSold;
        } else {
          acc.push({ ...curr });
        }

        return acc;
      }, []);
    };

    // Obtener ventas agregadas por producto para cada período
    const [aggregatedCurrent, aggregatedPrevious] = await Promise.all([
      aggregateSales(salesCurrent),
      aggregateSales(salesPrevious),
    ]);

    // Calcular ventas totales de cada período
    const totalSalesCurrent = aggregatedCurrent.reduce((sum, product) => sum + product.totalPrice, 0);
    const totalSalesPrevious = aggregatedPrevious.reduce((sum, product) => sum + product.totalPrice, 0);

    // Calcular el porcentaje de variación
    const percentageChange =
      totalSalesPrevious === 0 ? 100 : ((totalSalesCurrent - totalSalesPrevious) / totalSalesPrevious) * 100;

    // Determinar mensaje de tendencia
    let trendMessage = "Sin cambios";
    if (percentageChange > 0) {
      trendMessage = `Tendencia al alza del ${percentageChange.toFixed(2)}%`;
    } else if (percentageChange < 0) {
      trendMessage = `Tendencia a la baja del ${Math.abs(percentageChange).toFixed(2)}%`;
    }

    // Generar array comparativo de productos
    const productComparison = aggregatedCurrent.map((currentProduct) => {
      const previousProduct = aggregatedPrevious.find(
        (p) => p.idProduct === currentProduct.idProduct
      );

      const previousTotal = previousProduct ? previousProduct.totalPrice : 0;
      const change = previousTotal === 0 ? 100 : ((currentProduct.totalPrice - previousTotal) / previousTotal) * 100;

      return {
        idProduct: currentProduct.idProduct,
        name: currentProduct.name,
        totalPriceCurrent: currentProduct.totalPrice,
        totalStockSoldCurrent: currentProduct.totalStockSold,
        totalPricePrevious: previousTotal,
        totalStockSoldPrevious: previousProduct?.totalStockSold || 0,
        percentageChange: previousTotal === 0 ? 100 : parseFloat(change.toFixed(2)),
      };
    });

    return NextResponse.json({
      trendMessage,
      totalSalesCurrent,
      totalSalesPrevious,
      percentageChange: parseFloat(percentageChange.toFixed(2)),
      productComparison,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
