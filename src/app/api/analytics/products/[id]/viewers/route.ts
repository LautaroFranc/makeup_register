import { NextRequest, NextResponse } from "next/server";
import ProductView from "@/models/ProductView";
import Product from "@/models/Product";
import connectDB from "@/config/db";
import { authMiddleware } from "../../../../middleware";
import mongoose from "mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;

    const { id: productId } = await params;
    const userId = (await authCheck.json()).user._id;

    // Verificar que el producto pertenece al usuario
    const product = await Product.findOne({ _id: productId, user: userId });
    if (!product) {
      return NextResponse.json({ success: false, message: "Producto no encontrado o no autorizado" }, { status: 404 });
    }

    // Obtener filtros de query (ej: mes)
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "30", 10);

    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - days);

    // Agrupar vistas por IP
    const viewers = await ProductView.aggregate([
      {
        $match: {
          product: new mongoose.Types.ObjectId(productId),
          createdAt: { $gte: dateFilter },
        },
      },
      {
        $group: {
          _id: "$viewerIp",
          views: { $sum: 1 },
          lastView: { $max: "$createdAt" },
        },
      },
      {
        $project: {
          ip: "$_id",
          views: 1,
          lastView: 1,
          _id: 0,
        },
      },
      { $sort: { views: -1 } },
    ]);

    return NextResponse.json({ success: true, viewers });
  } catch (error: any) {
    console.error("Error obteniendo visualizaciones detalladas:", error);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
