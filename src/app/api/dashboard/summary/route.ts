import { NextRequest, NextResponse } from "next/server";
import Product from "@/models/Product";
import SaleProduct from "@/models/SaleProduct";
import connectDB from "@/config/db";
import { authMiddleware } from "../../middleware";
import { Product as ProductIterface } from "@/interface/product";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;

    const userId = (await authCheck.json()).user._id;

    // Obtener todos los productos del usuario
    const products: ProductIterface[] = await Product.find({ user: userId });

    // Calcular totales de inventario actual
    const productTotals = products.reduce(
      (acc, product) => {
        const sellPrice = parseFloat(product.sellPrice);
        const buyPrice = parseFloat(product.buyPrice);
        const stock = product.stock;

        return {
          valorInventario: acc.valorInventario + sellPrice * stock,
          costoInventario: acc.costoInventario + buyPrice * stock,
          totalStock: acc.totalStock + stock,
        };
      },
      {
        valorInventario: 0,
        costoInventario: 0,
        totalStock: 0,
      }
    );

    // Obtener todas las ventas del usuario
    const sales = await SaleProduct.find({ user: userId });

    // Calcular ingresos por ventas (ventas realizadas)
    const ingresosPorVentas = sales.reduce(
      (acc, sale) => acc + Number(sale.sellPrice) * sale.stock,
      0
    );

    // Calcular costo de productos vendidos
    const costoProductosVendidos = sales.reduce((acc, sale) => {
      const product = products.find(
        (p) => p._id.toString() === sale.idProduct.toString()
      );
      if (product) {
        const buyPrice = parseFloat(product.buyPrice);
        return acc + buyPrice * sale.stock;
      }
      return acc;
    }, 0);

    // Calcular ganancia neta real
    const gananciaNeta = ingresosPorVentas - costoProductosVendidos;

    // Calcular margen de ganancia real (%)
    const margenGananciaReal =
      ingresosPorVentas > 0 ? (gananciaNeta / ingresosPorVentas) * 100 : 0;

    // Calcular estadísticas de catálogo
    const totalProductos = products.length;
    const productosPublicados = products.filter((p) => p.published).length;
    const productosOcultos = totalProductos - productosPublicados;

    // Calcular estadísticas de stock
    const productosSinStock = products.filter((p) => p.stock === 0).length;
    const productosStockBajo = products.filter(
      (p) => p.stock > 0 && p.stock < 5
    ).length;

    // Calcular margen promedio de inventario
    const productosConMargen = products.filter(
      (p) => parseFloat(p.buyPrice) > 0 && parseFloat(p.sellPrice) > 0
    );

    const margenPromedioInventario =
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
        // Métricas financieras principales
        valorInventario: productTotals.valorInventario,
        costoInventario: productTotals.costoInventario,
        ingresosPorVentas: ingresosPorVentas,
        costoProductosVendidos: costoProductosVendidos,
        gananciaNeta: gananciaNeta,
        margenGananciaReal: Math.round(margenGananciaReal * 100) / 100,

        // Métricas de inventario
        totalStock: productTotals.totalStock,
        margenPromedioInventario:
          Math.round(margenPromedioInventario * 100) / 100,

        // Estadísticas de catálogo
        totalProductos,
        productosPublicados,
        productosOcultos,

        // Alertas de stock
        productosSinStock,
        productosStockBajo,

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
