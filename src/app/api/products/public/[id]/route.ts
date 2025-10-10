import { NextRequest, NextResponse } from "next/server";
import Product from "@/models/Product";
import Users from "@/models/Users";
import connectDB from "@/config/db";

connectDB();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "ID de producto requerido" },
        { status: 400 }
      );
    }

    // Buscar el producto por ID
    const product = await Product.findById(productId).select(
      "name description image images sellPrice category barcode stock published user"
    );

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // Solo mostrar productos publicados
    if (!product.published) {
      return NextResponse.json(
        { success: false, error: "Producto no disponible" },
        { status: 404 }
      );
    }

    // Obtener información del usuario propietario
    const user = await Users.findById(product.user).select("name slug");

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuario propietario no encontrado" },
        { status: 404 }
      );
    }

    // Formatear la respuesta sin datos sensibles
    const publicProduct = {
      _id: product._id,
      name: product.name,
      description: product.description,
      image: product.image,
      images: product.images,
      category: product.category,
      stock: product.stock,
      published: product.published,
      owner: {
        name: user.name,
        slug: user.slug,
      },
    };

    return NextResponse.json({
      success: true,
      product: publicProduct,
    });
  } catch (error: any) {
    console.error("Error fetching public product:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
