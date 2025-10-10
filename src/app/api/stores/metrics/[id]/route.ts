import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Store from "@/models/Store";
import Product from "@/models/Product";
import Category from "@/models/Category";
import { authMiddleware } from "../../../middleware";

connectDB();

// GET - Obtener métricas de una tienda específica
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const { id } = await params;

    // Verificar que la tienda pertenece al usuario
    const store = await Store.findOne({ _id: id, user: _id });
    if (!store) {
      return NextResponse.json(
        { success: false, error: "Tienda no encontrada" },
        { status: 404 }
      );
    }

    // Obtener métricas de productos
    const products = await Product.find({ store: id });
    const publishedProducts = await Product.find({
      store: id,
      published: true,
    });

    const totalProducts = products.length;
    const publishedCount = publishedProducts.length;

    const totalStock = products.reduce(
      (sum, product) => sum + product.stock,
      0
    );

    const totalValue = products.reduce((sum, product) => {
      const buyPrice = parseFloat(product.buyPrice) || 0;
      return sum + buyPrice * product.stock;
    }, 0);

    const totalGananciasEstimada = products.reduce((sum, product) => {
      const buyPrice = parseFloat(product.buyPrice) || 0;
      const sellPrice = parseFloat(product.sellPrice) || 0;
      return sum + (sellPrice - buyPrice) * product.stock;
    }, 0);

    const ganancias = products.reduce((sum, product) => {
      const buyPrice = parseFloat(product.buyPrice) || 0;
      const sellPrice = parseFloat(product.sellPrice) || 0;
      return sum + (sellPrice - buyPrice) * product.stock;
    }, 0);

    // Obtener métricas de categorías
    const categories = await Category.find({ store: id, isActive: true });
    const totalCategories = categories.length;

    // Calcular margen promedio
    const margenPromedio =
      totalProducts > 0
        ? products.reduce((sum, product) => {
            const buyPrice = parseFloat(product.buyPrice) || 0;
            const sellPrice = parseFloat(product.sellPrice) || 0;
            return sum + ((sellPrice - buyPrice) / sellPrice) * 100;
          }, 0) / totalProducts
        : 0;

    // Actualizar métricas en la tienda
    const updatedMetrics = {
      totalProducts,
      publishedProducts: publishedCount,
      totalCategories,
      totalStock,
      totalValue,
      lastUpdated: new Date(),
    };

    await Store.findByIdAndUpdate(id, { metrics: updatedMetrics });

    return NextResponse.json({
      success: true,
      metrics: {
        ...updatedMetrics,
        totalGananciasEstimada: totalGananciasEstimada.toFixed(2),
        ganancias: ganancias.toFixed(2),
        margenPromedio: margenPromedio.toFixed(2),
        productosOcultos: totalProducts - publishedCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching store metrics:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
