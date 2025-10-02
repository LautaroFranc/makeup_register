import { NextRequest, NextResponse } from "next/server";
import Product from "@/models/Product";
import connectDB from "@/config/db";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const barcode = searchParams.get("barcode");

    if (!barcode) {
      return NextResponse.json(
        { success: false, error: "Código de barras requerido" },
        { status: 400 }
      );
    }

    const existingProduct = await Product.findOne({ barcode });

    return NextResponse.json({
      success: true,
      exists: !!existingProduct,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
