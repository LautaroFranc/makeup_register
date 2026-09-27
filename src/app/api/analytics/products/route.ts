import { NextRequest, NextResponse } from "next/server";
import Product from "@/models/Product";
import connectDB from "@/config/db";
import { authMiddleware } from "../../middleware";

interface ProductViewsRow {
  _id: string;
  name: string;
  image?: string;
  published: boolean;
  views: number;
  share: number; // % del total de vistas del usuario
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;

    const userId = (await authCheck.json()).user._id;

    // $ifNull cubre los productos creados antes de que existiera el campo views.
    const rows = await Product.aggregate<ProductViewsRow>([
      { $match: { user: userId } },
      {
        $project: {
          name: 1,
          image: 1,
          published: 1,
          views: { $ifNull: ["$views", 0] },
        },
      },
      { $sort: { views: -1, name: 1 } },
    ]);

    const totalViews = rows.reduce((acc, r) => acc + r.views, 0);
    const maxViews = rows.reduce((acc, r) => Math.max(acc, r.views), 0);

    const products = rows.map((r) => ({
      ...r,
      _id: r._id.toString(),
      // Con totalViews en 0 la parte es 0 (y no NaN por división por cero).
      share: totalViews > 0 ? Number(((r.views / totalViews) * 100).toFixed(1)) : 0,
    }));

    return NextResponse.json({
      success: true,
      totals: {
        views: totalViews,
        products: products.length,
        // Productos sin ninguna visita: el insight accionable de esta vista.
        withoutViews: products.filter((p) => p.views === 0).length,
        maxViews,
      },
      products,
    });
  } catch (error: any) {
    console.error("Error obteniendo vistas por producto:", error);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
