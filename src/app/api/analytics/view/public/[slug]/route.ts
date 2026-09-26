import { NextRequest, NextResponse } from "next/server";
import Product from "@/models/Product";
import Store from "@/models/Store";
import connectDB from "@/config/db";

// POST - Registrar vista de producto
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await connectDB();
    const { slug } = await params;
    const body = await req.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ success: false, message: "ID de producto requerido" }, { status: 400 });
    }

    // El slug acota el incremento a los productos de esa tienda, para que un
    // storefront no pueda inflar las analíticas de otra tienda.
    const store = await Store.findOne({ slug, isActive: true });
    if (!store) {
      return NextResponse.json({ success: false, message: "Tienda no encontrada" }, { status: 404 });
    }

    // Solo guardamos un contador: el historial por fecha requiere otro modelo
    // (p. ej. ProductView) que no se usa todavia.
    const product = await Product.findOneAndUpdate(
      { _id: productId, store: store._id.toString() },
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!product) {
      return NextResponse.json({ success: false, message: "Producto no encontrado en esta tienda" }, { status: 404 });
    }

    return NextResponse.json({ success: true, views: product.views });
  } catch (error: any) {
    console.error("Error al registrar vista:", error);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
