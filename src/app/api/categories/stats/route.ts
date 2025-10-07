import { NextRequest, NextResponse } from "next/server";
import Category from "@/models/Category";
import Product from "@/models/Product";
import connectDB from "@/config/db";
import { authMiddleware } from "../../middleware";

connectDB();

// GET - Obtener estadísticas de categorías del usuario
export async function GET(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    // Estadísticas generales
    const totalCategories = await Category.countDocuments({ user: _id });
    const activeCategories = await Category.countDocuments({
      user: _id,
      isActive: true,
    });
    const inactiveCategories = totalCategories - activeCategories;

    // Categorías con productos publicados
    const categoriesWithPublicProducts = await Product.distinct("category", {
      user: _id,
      published: true,
    });

    const publicCategories = await Category.countDocuments({
      user: _id,
      name: { $in: categoriesWithPublicProducts },
      isActive: true,
    });

    // Categorías sin productos
    const categoriesWithoutProducts = await Category.find({
      user: _id,
      isActive: true,
    });

    const categoriesWithProductCount = await Promise.all(
      categoriesWithoutProducts.map(async (category) => {
        const productCount = await Product.countDocuments({
          user: _id,
          category: category.name,
        });
        return { category, productCount };
      })
    );

    const emptyCategories = categoriesWithProductCount.filter(
      (item) => item.productCount === 0
    ).length;

    // Categoría más popular (con más productos)
    const categoryStats = await Promise.all(
      categoriesWithProductCount.map(async (item) => {
        const publicCount = await Product.countDocuments({
          user: _id,
          category: item.category.name,
          published: true,
        });
        const privateCount = item.productCount - publicCount;

        return {
          name: item.category.name,
          totalProducts: item.productCount,
          publicProducts: publicCount,
          privateProducts: privateCount,
          color: item.category.color,
          icon: item.category.icon,
        };
      })
    );

    const mostPopularCategory = categoryStats.reduce((prev, current) =>
      prev.totalProducts > current.totalProducts ? prev : current
    );

    return NextResponse.json({
      success: true,
      stats: {
        totalCategories,
        activeCategories,
        inactiveCategories,
        publicCategories,
        emptyCategories,
        mostPopularCategory,
        categoryBreakdown: categoryStats,
      },
    });
  } catch (error: any) {
    console.error("Error fetching category stats:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
