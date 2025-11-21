import { NextRequest, NextResponse } from "next/server";
import Category from "@/models/Category";
import Product from "@/models/Product";
import connectDB from "@/config/db";
import { authMiddleware } from "../../middleware";

connectDB();

// GET - Obtener todas las categorías del usuario (privadas)
export async function GET(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Construir query para obtener todas las categorías del usuario
    const query: any = { user: _id };
    if (!includeInactive) {
      query.isActive = true;
    }

    const categories = await Category.find(query)
      .sort({ orden: 1, name: 1 })
      .select(
        "name slug description color icon isActive productCount orden createdAt updatedAt"
      );

    // Obtener estadísticas completas de cada categoría (todos los productos)
    const categoriesWithStats = await Promise.all(
      categories.map(async (category) => {
        const allProducts = await Product.find({
          user: _id,
          category: category.name,
        });

        const publicProducts = allProducts.filter((p) => p.published);
        const privateProducts = allProducts.filter((p) => !p.published);

        const totalProducts = allProducts.length;
        const publicProductCount = publicProducts.length;
        const privateProductCount = privateProducts.length;

        const totalStock = allProducts.reduce(
          (sum, product) => sum + product.stock,
          0
        );
        const totalValue = allProducts.reduce((sum, product) => {
          const buyPrice = parseFloat(product.buyPrice) || 0;
          return sum + buyPrice * product.stock;
        }, 0);

        return {
          _id: category._id,
          name: category.name,
          description: category.description,
          color: category.color,
          icon: category.icon,
          isActive: category.isActive,
          orden: category.orden,
          totalProducts,
          publicProductCount,
          privateProductCount,
          totalStock,
          totalValue: totalValue.toFixed(2),
        };
      })
    );

    return NextResponse.json({
      success: true,
      categories: categoriesWithStats,
      message: "Categorías privadas obtenidas exitosamente",
    });
  } catch (error: any) {
    console.error("Error fetching private categories:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
