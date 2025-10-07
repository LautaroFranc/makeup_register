import { NextRequest, NextResponse } from "next/server";
import Category from "@/models/Category";
import Product from "@/models/Product";
import Users from "@/models/Users";
import connectDB from "@/config/db";

connectDB();

// GET - Obtener productos de una categoría específica de un usuario
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; categorySlug: string }> }
) {
  try {
    const { slug, categorySlug } = await params;

    if (!slug || !categorySlug) {
      return NextResponse.json(
        { success: false, error: "Slug de usuario y categoría son requeridos" },
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

    // Buscar la categoría por slug
    const category = await Category.findOne({
      user: user._id,
      slug: categorySlug,
      isActive: true,
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const skip = (page - 1) * limit;

    // Obtener productos publicados de esta categoría
    const products = await Product.find({
      user: user._id,
      category: category.name,
      published: true,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("name description image images sellPrice barcode createdAt");

    // Contar total de productos publicados en esta categoría
    const totalProducts = await Product.countDocuments({
      user: user._id,
      category: category.name,
      published: true,
    });

    const totalPages = Math.ceil(totalProducts / limit);

    return NextResponse.json({
      success: true,
      category: {
        _id: category._id,
        name: category.name,
        description: category.description,
        color: category.color,
        icon: category.icon,
        productCount: totalProducts,
      },
      products: products.map((product) => ({
        _id: product._id,
        name: product.name,
        description: product.description,
        image: product.image,
        images: product.images,
        sellPrice: product.sellPrice,
        barcode: product.barcode,
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit,
      },
    });
  } catch (error: any) {
    console.error("Error fetching category products:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
