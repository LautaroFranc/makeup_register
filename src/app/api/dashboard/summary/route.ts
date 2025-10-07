import { NextRequest, NextResponse } from "next/server";
import Product from "@/models/Product";
import SaleProduct from "@/models/SaleProduct";
import connectDB from "@/config/db";
import { authMiddleware } from "../../middleware";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;

    const userId = (await authCheck.json()).user._id;

    // Obtener todos los productos del usuario
    const products = await Product.find({ user: userId });

    // Calcular totales de productos
    const productTotals = products.reduce(
      (acc, product) => {
        const sellPrice = parseFloat(product.sellPrice);
        const buyPrice = parseFloat(product.buyPrice);
        const stock = product.stock;

        return {
          totalGananciasEstimada:
            acc.totalGananciasEstimada + sellPrice * stock,
          totalCosto: acc.totalCosto + buyPrice * stock,
          totalStock: acc.totalStock + stock,
        };
      },
      {
        totalGananciasEstimada: 0,
        totalCosto: 0,
        totalStock: 0,
      }
    );

    // Obtener todas las ventas del usuario
    const sales = await SaleProduct.find({ user: userId });

    // Calcular ganancias reales (ventas realizadas)
    const gananciasReales = sales.reduce(
      (acc, sale) => acc + Number(sale.sellPrice) * sale.stock,
      0
    );

    // Calcular estadísticas adicionales
    const totalProductos = products.length;
    const productosPublicados = products.filter((p) => p.published).length;
    const productosOcultos = totalProductos - productosPublicados;

    // Calcular margen promedio
    const productosConMargen = products.filter(
      (p) => parseFloat(p.buyPrice) > 0 && parseFloat(p.sellPrice) > 0
    );

    const margenPromedio =
      productosConMargen.length > 0
        ? productosConMargen.reduce((acc, product) => {
            const buyPrice = parseFloat(product.buyPrice);
            const sellPrice = parseFloat(product.sellPrice);
            const margin = ((sellPrice - buyPrice) / buyPrice) * 100;
            return acc + margin;
          }, 0) / productosConMargen.length
        : 0;

    const response = {
      success: true,
      data: {
        // Datos principales del dashboard
        totalGananciasEstimada: productTotals.totalGananciasEstimada,
        ganancias: gananciasReales,
        totalCosto: productTotals.totalCosto,
        totalStock: productTotals.totalStock,

        // Estadísticas adicionales
        totalProductos,
        productosPublicados,
        productosOcultos,
        margenPromedio: Math.round(margenPromedio * 100) / 100,

        // Fecha de actualización
        lastUpdated: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error en dashboard summary:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
