import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Product from "@/models/Product";
import { authMiddleware } from "../../middleware";

connectDB();

/**
 * GET /api/products/all
 * Obtiene TODOS los productos del usuario sin paginación
 * Ideal para usar en selects, dropdowns y formularios
 *
 * Query params opcionales:
 * - onlyPublished: "true" para obtener solo productos publicados (default: true)
 * - withStock: "true" para obtener solo productos con stock > 0
 * - withValidPrices: "true" para excluir productos con precios en 0 (default: true)
 * - fields: campos específicos a incluir (ej: "name,sellPrice,stock")
 */
export async function GET(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const userId = (await authCheck.json()).user._id;

    const { searchParams } = new URL(req.url);
    // Por defecto, solo productos publicados y con precios válidos
    const onlyPublished = searchParams.get("onlyPublished") !== "false"; // default true
    const withStock = searchParams.get("withStock") === "true";
    const withValidPrices = searchParams.get("withValidPrices") !== "false"; // default true
    const fieldsParam = searchParams.get("fields");

    // Construir query
    const query: any = { user: userId };

    if (onlyPublished) {
      query.published = true;
    }

    if (withStock) {
      query.stock = { $gt: 0 };
    }

    // Filtrar productos con precios válidos (> 0)
    if (withValidPrices) {
      query.$and = [
        { buyPrice: { $nin: ["0", ""], $exists: true } },
        { sellPrice: { $nin: ["0", ""], $exists: true } },
      ];
    }

    // Determinar qué campos incluir
    let selectFields = fieldsParam
      ? fieldsParam.split(",").join(" ")
      : "name buyPrice sellPrice stock code category image images published";

    // Obtener todos los productos
    const products = await Product.find(query)
      .select(selectFields)
      .sort({ name: 1 }) // Ordenar alfabéticamente
      .lean(); // Usar lean() para mejor rendimiento

    return NextResponse.json({
      success: true,
      products,
      total: products.length,
    });
  } catch (error: any) {
    console.error("Error al obtener todos los productos:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener los productos",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
