import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Store from "@/models/Store";
import Lead from "@/models/Lead";
import ProductView from "@/models/ProductView";
import Campaign from "@/models/Campaign";
import { authMiddleware } from "../../middleware";

connectDB();

// GET /api/marketing/funnel?days=30
//
// Embudo de MEDICIÓN. Dos advertencias que la UI repite al usuario y que no
// son detalle técnico:
//
// 1. La primera etapa no es un recorrido. ProductView es anónimo y Lead no
//    guarda IP, así que "visitas → leads" es el cociente entre dos conteos
//    independientes, no cuántas personas pasaron de una etapa a otra. Sirve
//    para ver proporciones, no para claimearle el journey a nadie.
// 2. Las etapas de Lead son anidadas (un cliente también fue contactado), que
//    es la semántica correcta de embudo pero impide sumar las etapas.
export async function GET(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const days = Math.min(
      365,
      Math.max(1, parseInt(searchParams.get("days") || "30", 10) || 30)
    );

    const store = await Store.findOne(
      storeId ? { _id: storeId, user: _id } : { user: _id, isActive: true }
    );
    if (!store) {
      return NextResponse.json(
        { success: false, error: "No se encontró una tienda para el usuario" },
        { status: 404 }
      );
    }

    const from = new Date(Date.now() - days * 86400000);
    const storeObjectId = store._id;

    const [vistas, leadByStatus, campaigns, leadByCampaign, viewsByCampaign] =
      await Promise.all([
        ProductView.countDocuments({ store: storeObjectId, createdAt: { $gte: from } }),

        Lead.aggregate([
          { $match: { user: _id, store: storeObjectId, createdAt: { $gte: from } } },
          { $group: { _id: "$status", n: { $sum: 1 } } },
        ]),

        Campaign.find({ user: _id, store: storeObjectId }).select("name channel"),

        Lead.aggregate([
          { $match: { user: _id, store: storeObjectId, createdAt: { $gte: from } } },
          {
            $group: {
              _id: "$campaign",
              leads: { $sum: 1 },
              clientes: { $sum: { $cond: [{ $eq: ["$status", "cliente"] }, 1, 0] } },
            },
          },
        ]),

        ProductView.aggregate([
          { $match: { store: storeObjectId, createdAt: { $gte: from } } },
          { $group: { _id: "$campaign", vistas: { $sum: 1 } } },
        ]),
      ]);

    const statusCount: Record<string, number> = {};
    for (const row of leadByStatus) statusCount[row._id] = row.n;

    const clientes = statusCount.cliente || 0;
    const interesados = (statusCount.interesado || 0) + clientes;
    const contactados = (statusCount.contactado || 0) + interesados;
    const leads = Object.values(statusCount).reduce((a, b) => a + b, 0);

    const rate = (fromN: number, toN: number) =>
      fromN > 0 ? Math.round((toN / fromN) * 1000) / 10 : null;

    // Cruce por campaña, para ver qué post trajo clientes y no sólo vistas.
    const leadByCampaignMap: Record<string, { leads: number; clientes: number }> = {};
    for (const row of leadByCampaign) {
      if (!row._id) continue;
      leadByCampaignMap[String(row._id)] = { leads: row.leads, clientes: row.clientes };
    }
    const viewsByCampaignMap: Record<string, number> = {};
    for (const row of viewsByCampaign) {
      if (!row._id) continue;
      viewsByCampaignMap[String(row._id)] = row.vistas;
    }

    const porCampana = campaigns
      .map((c) => {
        const key = String(c._id);
        const l = leadByCampaignMap[key] || { leads: 0, clientes: 0 };
        return {
          id: key,
          name: c.name,
          channel: c.channel,
          vistas: viewsByCampaignMap[key] || 0,
          leads: l.leads,
          clientes: l.clientes,
        };
      })
      .filter((c) => c.vistas > 0 || c.leads > 0)
      .sort((a, b) => b.clientes - a.clientes || b.leads - a.leads || b.vistas - a.vistas);

    return NextResponse.json({
      success: true,
      days,
      etapas: [
        {
          key: "vistas",
          label: "Visitas a productos",
          valor: vistas,
          ayuda: "Cuánta gente llegó a ver un producto tuyo en el período.",
        },
        {
          key: "leads",
          label: "Leads",
          valor: leads,
          ayuda: "Personas que dejaron su contacto. Incluye los que después se fueron.",
        },
        {
          key: "contactados",
          label: "Contactados",
          valor: contactados,
          ayuda: "A los que les respondiste al menos una vez.",
        },
        {
          key: "interesados",
          label: "Interesados",
          valor: interesados,
          ayuda: "Mostraron interés concreto en comprar.",
        },
        {
          key: "clientes",
          label: "Clientes",
          valor: clientes,
          ayuda: "Compraron. Este es el número que importa.",
        },
      ],
      tasas: {
        vistasALeads: rate(vistas, leads),
        leadsAContactados: rate(leads, contactados),
        contactadosAInteresados: rate(contactados, interesados),
        interesadosAClientes: rate(interesados, clientes),
      },
      alertas: [
        {
          key: "sin-contactar",
          valor: statusCount.nuevo || 0,
          titulo: "Leads sin tocar",
          texto:
            "Hay leads en estado 'nuevo'. Si este número crece, el problema es de seguimiento comercial, no de publicidad.",
        },
        {
          key: "inactivos",
          valor: statusCount.inactivo || 0,
          titulo: "Leads inactivos",
          texto:
            "Marcados como inactivos o desuscritos. Si son muchos, revisá si el contenido atrae a gente que no compra.",
        },
      ],
      porCampana,
    });
  } catch (error: any) {
    console.error("Error al calcular el embudo:", error);
    return NextResponse.json(
      { success: false, error: "Error interno" },
      { status: 500 }
    );
  }
}