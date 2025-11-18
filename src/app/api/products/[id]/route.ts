import { NextRequest, NextResponse } from "next/server";
import Product from "@/models/Product";
import connectDB from "@/config/db";
import { authMiddleware } from "../../middleware";

connectDB();

export async function GET(
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

    // Buscar el producto y verificar que pertenece al usuario
    const product = await Product.findOne({ _id: productId, user: userId });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return NextResponse.json(
        { success: false, error: "ID de producto inválido" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

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
    const { barcode, published } = body;

    // Validar que al menos un campo esté presente
    if (barcode === undefined && published === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Se requiere al menos un campo para actualizar",
        },
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

    // Si se está actualizando el barcode, verificar que no esté en uso
    if (barcode !== undefined) {
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
    }

    // Preparar los campos a actualizar
    const updateData: any = {};
    if (barcode !== undefined) updateData.barcode = barcode;
    if (published !== undefined) updateData.published = published;

    // Actualizar el producto
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: "Producto actualizado exitosamente",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
