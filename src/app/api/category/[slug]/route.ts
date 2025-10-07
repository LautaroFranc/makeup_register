import { NextRequest, NextResponse } from "next/server";
import Category from "@/models/Category";
import Product from "@/models/Product";
import Users from "@/models/Users";
import connectDB from "@/config/db";

connectDB();

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

    // Obtener categorías activas del usuario
    const categories = await Category.find({
      user: user._id,
      isActive: true,
    })
      .sort({ name: 1 })
      .select("name description color icon");

    // Obtener estadísticas de productos por categoría
    const categoriesWithStats = await Promise.all(
      categories.map(async (category) => {
        // Contar productos publicados en esta categoría
        const productCount = await Product.countDocuments({
          user: user._id,
          category: category.name,
          published: true,
        });

        return {
          _id: category._id,
          name: category.name,
          description: category.description,
          color: category.color,
          icon: category.icon,
          productCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      user: {
        name: user.name,
        slug: user.slug,
      },
      categories: categoriesWithStats,
    });
  } catch (error: any) {
    console.error("Error fetching categories by user slug:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
