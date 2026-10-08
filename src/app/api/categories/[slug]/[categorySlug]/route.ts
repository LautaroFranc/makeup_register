import { NextRequest, NextResponse } from "next/server";
import slugify from "slugify";
import Category from "@/models/Category";
import Product from "@/models/Product";
import Users from "@/models/Users";
import connectDB from "@/config/db";

connectDB();

// Normaliza tanto el valor del path como el nombre de la categoría a la misma
// forma, así "Peluquería", "peluqueria" y "PELUQUERÍA" matchean lo mismo.
const normalize = (value: string) => slugify(value, { lower: true, strict: true });

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

    const target = normalize(categorySlug);
    if (!target) {
      // El path no aporta ningún carácter alfanumérico: no puede identificar nada.
      return NextResponse.json(
        { success: false, error: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    // 1) Camino rápido: match directo por slug (usa el índice user+slug).
    let category = await Category.findOne({
      user: user._id,
      slug: target,
      isActive: true,
    });

    // 2) Fallback: las categorías creadas antes de que existiera el campo slug no
    //    lo tienen todavía, y el cliente puede mandar el nombre crudo con tildes.
    //    Se normaliza el nombre de cada candidato y se compara en memoria (son
    //    pocas categorías por usuario). Ordenado por nombre para que dos nombres
    //    que colisionen en el mismo slug resuelvan siempre igual.
    if (!category) {
      const active = await Category.find({
        user: user._id,
        isActive: true,
      }).sort({ name: 1 });

      category = active.find((c) => normalize(String(c.name)) === target) ?? null;
    }

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
      .select("name description image images sellPrice barcode createdAt hasDiscount discountPercentage discountedPrice discountStartDate discountEndDate");

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
        slug: category.slug || target,
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
        hasDiscount: product.hasDiscount,
        discountPercentage: product.discountPercentage,
        discountedPrice: product.discountedPrice,
        discountStartDate: product.discountStartDate,
        discountEndDate: product.discountEndDate,
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
