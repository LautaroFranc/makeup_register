import { NextRequest, NextResponse } from "next/server";
import Store from "@/models/Store";
import Product from "@/models/Product";
import OrderSession, { IOrderSession } from "@/models/OrderSession";
import connectDB from "@/config/db";
import { authMiddleware } from "../../middleware";

const STALE_PAYMENT_MS = 1000 * 60 * 60 * 2; // 2 horas

// Un carrito cuenta como abandonado si fue marcado así, o si quedó en
// PAYMENT_INITIATED hace más de 2 horas. Es una función (y no un objeto
// constante) para que el umbral se recalcule en cada request y no se congele
// al arrancar el servidor.
const isAbandonedFilter = () => ({
  $or: [
    { status: "ABANDONED" },
    { status: "PAYMENT_INITIATED", updatedAt: { $lt: new Date(Date.now() - STALE_PAYMENT_MS) } },
  ],
});

interface Counters {
  cartsCreated: number;
  paymentsInitiated: number;
  completed: number;
  abandoned: number;
}

interface ViewsTotal {
  total: number;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;

    const userId = (await authCheck.json()).user._id;

    // 1. Encontrar todas las tiendas de este usuario
    const userStores = await Store.find({ user: userId }).select("_id").lean();
    const storeIds = userStores.map((s) => s._id.toString());

    if (storeIds.length === 0) {
      return NextResponse.json({ success: true, stats: emptyStats() });
    }

    // 2. Contadores del embudo, agregados en Mongo (sin traer los documentos)
    const [counters] = await OrderSession.aggregate<Counters>([
      { $match: { storeId: { $in: storeIds } } },
      {
        $group: {
          _id: null,
          cartsCreated: { $sum: 1 },
          paymentsInitiated: {
            $sum: {
              $cond: [
                { $in: ["$status", ["PAYMENT_INITIATED", "COMPLETED", "ABANDONED"]] },
                1,
                0,
              ],
            },
          },
          completed: { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } },
          abandoned: {
            $sum: { $cond: [isAbandonedFilter(), 1, 0] },
          },
        },
      },
    ]);

    // 3. Total de vistas de producto del usuario
    const [viewsAgg] = await Product.aggregate<ViewsTotal>([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$views", 0] } } } },
    ]);
    const totalProductViews = viewsAgg?.total ?? 0;

    const { cartsCreated, paymentsInitiated, completed, abandoned } = counters ?? {
      cartsCreated: 0,
      paymentsInitiated: 0,
      completed: 0,
      abandoned: 0,
    };

    // Calcular embudo (Funnel)
    const funnelData = [
      { name: "Ver Producto", value: totalProductViews },
      { name: "Agregar a Carrito", value: cartsCreated },
      { name: "Iniciar Pago", value: paymentsInitiated },
      { name: "Compra Exitosa", value: completed },
    ];

    const cartStatusData = [
      { name: "Completados", value: completed, color: "#10B981" },
      { name: "Abandonados", value: abandoned, color: "#F43F5E" },
      { name: "Pendientes", value: Math.max(0, cartsCreated - completed - abandoned), color: "#F59E0B" },
    ];

    const conversionRate =
      totalProductViews > 0 ? ((completed / totalProductViews) * 100).toFixed(1) : "0.0";

    // 4. Últimos carritos recuperables (solo 5 documentos)
    const recentAbandoned = await OrderSession.find({
      storeId: { $in: storeIds },
      ...isAbandonedFilter(),
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean<IOrderSession[]>();

    return NextResponse.json({
      success: true,
      stats: {
        totalProductViews,
        cartsCreated,
        abandoned,
        conversionRate,
        funnelData,
        cartStatusData,
        recentAbandoned,
      },
    });
  } catch (error: any) {
    console.error("Error obteniendo analíticas:", error);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}

function emptyStats() {
  return {
    totalProductViews: 0,
    cartsCreated: 0,
    abandoned: 0,
    conversionRate: "0.0",
    funnelData: [],
    cartStatusData: [],
    recentAbandoned: [],
  };
}
