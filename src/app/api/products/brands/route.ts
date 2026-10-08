import { NextRequest, NextResponse } from "next/server";
import Product from "@/models/Product";
import connectDB from "@/config/db";
import { authMiddleware } from "../../middleware";

connectDB();

// Marcas distintas del usuario, para el autocompletado del selector de marca.
// Mismo scope que /api/products/private (user, sin store) para que las opciones
// coincidan con lo que la tabla de productos muestra.
export async function GET(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const brands = ((await Product.distinct("brand", { user: _id })) as unknown[])
      .map((b) => String(b ?? "").trim())
      .filter((b) => b !== "")
      .sort((a, b) => a.localeCompare(b, "es"));

    return NextResponse.json({ success: true, brands });
  } catch (error: any) {
    console.error("Error fetching brands:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
