import { NextRequest, NextResponse } from "next/server";
import Category from "@/models/Category";
import Product from "@/models/Product";
import connectDB from "@/config/db";
import { authMiddleware } from "../../middleware";

connectDB();

// GET - Obtener solo categorías públicas del usuario autenticado
export async function GET(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    // Obtener categorías que tienen al menos un producto publicado
    const categoriesWithPublicProducts = await Product.distinct("category", {
      user: _id,
      published: true,
    });

    // Obtener información completa de estas categorías
    const categories = await Category.find({
      user: _id,
      name: { $in: categoriesWithPublicProducts },
      isActive: true,
    })
      .sort({ orden: 1, name: 1 })
      .select("name description color icon productCount orden");

    // Obtener estadísticas de productos publicados por categoría
    const categoriesWithStats = await Promise.all(
      categories.map(async (category) => {
        const publicProducts = await Product.find({
          user: _id,
          category: category.name,
          published: true,
        });

        const totalProducts = publicProducts.length;
        const totalStock = publicProducts.reduce(
          (sum, product) => sum + product.stock,
          0
        );
        const totalValue = publicProducts.reduce((sum, product) => {
          const buyPrice = parseFloat(product.buyPrice) || 0;
          return sum + buyPrice * product.stock;
        }, 0);

        return {
          _id: category._id,
          name: category.name,
          description: category.description,
          color: category.color,
          icon: category.icon,
          totalProducts,
          totalStock,
          totalValue: totalValue.toFixed(2),
        };
      })
    );

    return NextResponse.json({
      success: true,
      categories: categoriesWithStats,
      message: "Categorías públicas obtenidas exitosamente",
    });
  } catch (error: any) {
    console.error("Error fetching public categories:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
