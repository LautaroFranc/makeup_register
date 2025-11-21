import { NextRequest, NextResponse } from "next/server";
import Category from "@/models/Category";
import Product from "@/models/Product";
import Users from "@/models/Users";
import connectDB from "@/config/db";

connectDB();

// GET - Obtener categorías públicas de un usuario por slug
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Slug de usuario es requerido" },
        { status: 400 }
      );
    }

    // Buscar el usuario por slug
    const user = await Users.findOne({ slug });
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Obtener información completa de estas categorías
    const categories = await Category.find({
      user: user._id,
      isActive: true,
    })
      .sort({ orden: 1, name: 1 })
      .select("name description color icon orden");

    // Obtener estadísticas de productos publicados por categoría
    const categoriesWithStats = await Promise.all(
      categories.map(async (category) => {
        const publicProducts = await Product.find({
          user: user._id,
          category: category.name,
          published: true,
        });

        const totalProducts = publicProducts.length;
        const totalStock = publicProducts.reduce(
          (sum, product) => sum + product.stock,
          0
        );

        return {
          _id: category._id,
          name: category.name,
          description: category.description,
          color: category.color,
          icon: category.icon,
          productCount: totalProducts,
          totalStock,
        };
      })
    );

    return NextResponse.json({
      success: true,
      categories: categoriesWithStats,
    });
  } catch (error: any) {
    console.error("Error fetching public categories by user slug:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
