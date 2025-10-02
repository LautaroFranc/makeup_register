import { NextRequest, NextResponse } from "next/server";
import Product from "@/models/Product";
import connectDB from "@/config/db";
import { authMiddleware } from "../../middleware";

connectDB();

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;

    const userId = (await authCheck.json()).user._id;
    const { id: productId } = await params;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { barcode } = body;

    if (!barcode) {
      return NextResponse.json(
        { success: false, error: "Código de barras requerido" },
        { status: 400 }
      );
    }

    // Verificar que el producto pertenece al usuario
    const product = await Product.findOne({ _id: productId, user: userId });
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // Verificar que el código de barras no esté en uso por otro producto
    const existingProduct = await Product.findOne({
      barcode,
      _id: { $ne: productId },
    });

    if (existingProduct) {
      return NextResponse.json(
        { success: false, error: "El código de barras ya está en uso" },
        { status: 400 }
      );
    }

    // Actualizar el producto
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { barcode },
      { new: true, runValidators: true }
    );

    return NextResponse.json(updatedProduct);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
