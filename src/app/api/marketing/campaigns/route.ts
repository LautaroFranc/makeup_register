import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Campaign from "@/models/Campaign";
import Lead from "@/models/Lead";
import ProductView from "@/models/ProductView";
import Store from "@/models/Store";
import { authMiddleware } from "../../middleware";

connectDB();

// GET /api/marketing/campaigns
// Lista las campañas del usuario con sus métricas agregadas.
export async function GET(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const status = searchParams.get("status");

    const storeFilter = storeId
      ? { _id: storeId, user: _id }
      : { user: _id, isActive: true };

    const store = await Store.findOne(storeFilter);
    if (!store) {
      return NextResponse.json(
        { success: false, error: "No se encontró una tienda para el usuario" },
        { status: 404 }
      );
    }

    const query: any = { user: _id, store: store._id };
    if (status && status !== "todas") {
      query.status = status;
    }

    const campaigns = await Campaign.find(query).sort({ createdAt: -1 });

    const campaignIds = campaigns.map((c) => c._id);

    // Agregamos leads y vistas en dos consultas, no una por campaña:
    // con muchas campañas el endpoint se vuelve lentísimo de otro modo.
    const [leadAgg, viewAgg] = await Promise.all([
      Lead.aggregate([
        { $match: { user: _id, campaign: { $in: campaignIds } } },
        {
          $group: {
            _id: "$campaign",
            leads: { $sum: 1 },
            clientes: {
              $sum: { $cond: [{ $eq: ["$status", "cliente"] }, 1, 0] },
            },
          },
        },
      ]),
      ProductView.aggregate([
        { $match: { store: store._id, campaign: { $in: campaignIds } } },
        {
          $group: {
            _id: "$campaign",
            vistas: { $sum: 1 },
          },
        },
      ]),
    ]);

    const leadMap = new Map(leadAgg.map((r) => [String(r._id), r]));
    const viewMap = new Map(viewAgg.map((r) => [String(r._id), r]));

    const data = campaigns.map((c) => {
      const leadRow: any = leadMap.get(String(c._id));
      const viewRow: any = viewMap.get(String(c._id));

      const leads = leadRow?.leads || 0;
      const clientes = leadRow?.clientes || 0;
      const vistas = viewRow?.vistas || 0;

      return {
        ...c.toObject(),
        leads,
        clientes,
        vistas,
        // Vista → Lead: si esto es 0, nadie que llegó al producto dejó
        // contacto. Si es muy bajo, el problema suele estar en el CTA.
        conversion: vistas > 0 ? Number(((leads / vistas) * 100).toFixed(2)) : null,
      };
    });

    const totals = data.reduce(
      (acc, c) => ({
        campanas: acc.campanas + 1,
        leads: acc.leads + c.leads,
        clientes: acc.clientes + c.clientes,
        vistas: acc.vistas + c.vistas,
      }),
      { campanas: 0, leads: 0, clientes: 0, vistas: 0 }
    );

    return NextResponse.json({
      success: true,
      store: { _id: store._id, name: store.name, slug: store.slug },
      totals,
      campaigns: data,
    });
  } catch (error: any) {
    console.error("Error obteniendo campañas:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/marketing/campaigns
// Alta manual: para canales que no traen UTM (WhatsApp, venta presencial).
export async function POST(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const body = await req.json();
    const { name, channel, utmMedium, status, notes, storeId } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    // Validamos pertenencia explícita de la tienda: no caemos al fallback
    // de isActive cuando el cliente sí envió un storeId.
    const storeFilter = storeId
      ? { _id: storeId, user: _id }
      : { user: _id, isActive: true };

    const store = await Store.findOne(storeFilter);
    if (!store) {
      return NextResponse.json(
        {
          success: false,
          error: storeId
            ? "La tienda no existe o no pertenece al usuario"
            : "No se encontró una tienda activa",
        },
        { status: 400 }
      );
    }

    const existing = await Campaign.findOne({
      user: _id,
      store: store._id,
      name: name.trim(),
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Ya existe una campaña con ese nombre" },
        { status: 400 }
      );
    }

    const campaign = await Campaign.create({
      name: name.trim(),
      channel: channel || "otro",
      utmMedium,
      status: status || "activa",
      notes,
      user: _id,
      store: store._id,
    });

    return NextResponse.json(
      { success: true, campaign },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creando campaña:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
