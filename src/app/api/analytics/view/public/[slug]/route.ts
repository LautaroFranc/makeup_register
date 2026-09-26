import { NextRequest, NextResponse } from "next/server";
import Product from "@/models/Product";
import connectDB from "@/config/db";

// POST - Registrar vista de producto
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await connectDB();
    const body = await req.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ success: false, message: "ID de producto requerido" }, { status: 400 });
    }

    // Aquí simplemente incrementamos un contador de vistas en el producto
    // o podríamos crear un modelo "ProductView" si quisiéramos historial por fecha.
    // Por simplicidad, aumentaremos un campo "views" en el producto.
    
    await Product.findByIdAndUpdate(productId, { $inc: { views: 1 } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error al registrar vista:", error);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
