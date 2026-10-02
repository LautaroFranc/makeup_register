import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/config/db";
import ContentPiece from "@/models/ContentPiece";
import Campaign from "@/models/Campaign";
import Lead from "@/models/Lead";
import ProductView from "@/models/ProductView";
import Store from "@/models/Store";
import { authMiddleware } from "../middleware";
import { formatPhoneForDisplay } from "@/lib/whatsapp";
import { slugifyUtm } from "@/lib/utm";

connectDB();

// Una pieza de contenido ES una campaña. Reutilizamos la Campaign en vez de
// inventar un segundo modelo de atribución: es lo que permite después
// answering "qué post trajo clientes" con los números que ya existen.
async function ensureCampaignForPiece(
  title: string,
  network: string,
  userId: string,
  storeId: mongoose.Types.ObjectId | string
) {
  const name = slugifyUtm(title);
  if (!name) return null;

  const existing = await Campaign.findOne({ user: userId, store: storeId, name });
  if (existing) return existing;

  return Campaign.create({
    name,
    channel: network,
    utmMedium: "organic",
    status: "activa",
    user: userId,
    store: storeId,
  });
}

const VALID_NETWORKS = ["facebook", "whatsapp"];
const VALID_FORMATS = ["post", "reel", "video", "story", "catalogo", "mensaje"];
const VALID_STATUSES = [
  "idea",
  "listo",
  "programado",
  "publicado",
  "descartado",
];

async function resolveStore(req: NextRequest, userId: string, storeId?: string | null) {
  const filter = storeId
    ? { _id: storeId, user: userId }
    : { user: userId, isActive: true };
  return Store.findOne(filter);
}

// GET /api/content
// from/to en formato YYYY-MM-DD. Sin ellos devuelve todo lo del usuario
// (el backlog no tiene fecha y se pide así).
export async function GET(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const network = searchParams.get("network");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const onlyUnscheduled = searchParams.get("unscheduled");

    const store = await resolveStore(req, _id, storeId);
    if (!store) {
      return NextResponse.json(
        { success: false, error: "No se encontró una tienda para el usuario" },
        { status: 404 }
      );
    }

    const query: any = { user: _id, store: store._id };

    if (network && VALID_NETWORKS.includes(network)) {
      query.network = network;
    }
    if (status && VALID_STATUSES.includes(status)) {
      query.status = status;
    }
    if (onlyUnscheduled === "true") {
      query.scheduledFor = null;
      query.status = { $ne: "descartado" };
    }
    if (from || to) {
      query.scheduledFor = { ...(query.scheduledFor || {}) };
      if (from) query.scheduledFor.$gte = new Date(`${from}T00:00:00`);
      if (to) query.scheduledFor.$lte = new Date(`${to}T23:59:59.999`);
    }

    const pieces = await ContentPiece.find(query)
      // La foto y el nombre del producto vienen poblados: la UI los muestra
      // en la tarjeta para no tener que ir a buscar la imagen a Products.
      .populate("product", "name image sellPrice")
      .populate("promotion", "name type")
      .populate("campaign", "name channel")
      .sort({ scheduledFor: 1, createdAt: -1 });

    // Métricas de la campaña de cada pieza. Dos agregaciones en vez de una
    // consulta por pieza: con 30 piezas en la grilla la alternativa son 60
    // round-trips a Mongo.
    const campaignIds = pieces.map((p) => p.campaign).filter(Boolean);

    const [leadAgg, viewAgg] = await Promise.all([
      campaignIds.length
        ? Lead.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(String(_id)), campaign: { $in: campaignIds } } },
            {
              $group: {
                _id: "$campaign",
                leads: { $sum: 1 },
                clientes: {
                  $sum: { $cond: [{ $eq: ["$status", "cliente"] }, 1, 0] },
                },
              },
            },
          ])
        : [],
      campaignIds.length
        ? ProductView.aggregate([
            { $match: { campaign: { $in: campaignIds } } },
            { $group: { _id: "$campaign", vistas: { $sum: 1 } } },
          ])
        : [],
    ]);

    const metricMap: Record<string, { leads: number; clientes: number; vistas: number }> = {};
    for (const row of leadAgg) {
      metricMap[String(row._id)] = {
        leads: row.leads,
        clientes: row.clientes,
        vistas: 0,
      };
    }
    for (const row of viewAgg) {
      const key = String(row._id);
      const prev = metricMap[key] || { leads: 0, clientes: 0, vistas: 0 };
      metricMap[key] = { ...prev, vistas: row.vistas };
    }

    // Tras populate, campaign es un documento; si la pieza se guardó sin
    // campaña puede venir como id plano. Normalizo las dos formas.
    const campaignIdOf = (p: any): string | null => {
      const c = p.campaign;
      if (!c) return null;
      return String(c._id ?? c);
    };

    return NextResponse.json({
      success: true,
      pieces: pieces.map((p) => ({
        ...p.toObject(),
        metrics: campaignIdOf(p)
          ? metricMap[campaignIdOf(p)!] || { leads: 0, clientes: 0, vistas: 0 }
          : null,
      })),
      // El link de WhatsApp se arma en el cliente: necesita el texto de la
      // pieza, que el servidor no tiene.
      whatsapp: store.paymentMethods?.directSale?.whatsapp || null,
      whatsappDisplay: formatPhoneForDisplay(
        store.paymentMethods?.directSale?.whatsapp
      ),
      // Base para armar el link de medición. Se prioriza customUrl (la
      // tienda real donde cae la gente) y se cae al preview si no hay.
      storeUrl: store.customUrl || null,
      storeSlug: store.slug || null,
    });
  } catch (error: any) {
    console.error("Error al listar contenido:", error);
    return NextResponse.json(
      { success: false, error: "Error interno" },
      { status: 500 }
    );
  }
}

// POST /api/content
export async function POST(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const body = await req.json();
    const {
      title,
      copy = "",
      notes,
      network = "facebook",
      format = "post",
      status = "idea",
      scheduledFor = null,
      product,
      promotion,
      results = {},
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "El título es requerido" },
        { status: 400 }
      );
    }

    if (!VALID_NETWORKS.includes(network)) {
      return NextResponse.json(
        { success: false, error: "Red no válida" },
        { status: 400 }
      );
    }
    if (!VALID_FORMATS.includes(format)) {
      return NextResponse.json(
        { success: false, error: "Formato no válido" },
        { status: 400 }
      );
    }
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Estado no válido" },
        { status: 400 }
      );
    }

    const store = await resolveStore(req, _id, body.storeId);
    if (!store) {
      return NextResponse.json(
        { success: false, error: "No se encontró una tienda para el usuario" },
        { status: 404 }
      );
    }

        // Cada pieza queda atada a una campaña para poder medirla. Se hace
    // find-or-create por slug del título, así reintentar no duplica.
    const campaign = await ensureCampaignForPiece(
      title,
      network,
      _id,
      store._id
    );

    const piece = await ContentPiece.create({
      title: title.trim(),
      copy,
      notes,
      network,
      format,
      status,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      publishedAt: status === "publicado" ? new Date() : null,
      product: product || undefined,
      promotion: promotion || undefined,
      campaign: campaign ? campaign._id : undefined,
      results: {
        reach: Number(results.reach) || 0,
        interactions: Number(results.interactions) || 0,
      },
      user: _id,
      store: store._id,
    });

    return NextResponse.json({ success: true, piece });
  } catch (error: any) {
    console.error("Error al crear contenido:", error);
    return NextResponse.json(
      { success: false, error: "Error interno" },
      { status: 500 }
    );
  }
}

// PUT /api/content
export async function PUT(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const body = await req.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Falta el id" },
        { status: 400 }
      );
    }

    // El scope va en el filtro, no después: una pieza de otra tienda
    // simplemente no aparece.
    const piece = await ContentPiece.findOne({ _id: id, user: _id });
    if (!piece) {
      return NextResponse.json(
        { success: false, error: "No se encontró la pieza" },
        { status: 404 }
      );
    }

    // Valida antes de mutar: si no, un valor inválido ya quedó aplicado en el
    // documento y la respuesta 400 llega tarde.
    if (body.network && !VALID_NETWORKS.includes(body.network)) {
      return NextResponse.json(
        { success: false, error: "Red no válida" },
        { status: 400 }
      );
    }
    if (body.format && !VALID_FORMATS.includes(body.format)) {
      return NextResponse.json(
        { success: false, error: "Formato no válido" },
        { status: 400 }
      );
    }
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: "Estado no válido" },
        { status: 400 }
      );
    }

    const fields: string[] = [
      "title",
      "copy",
      "notes",
      "network",
      "format",
      "status",
      "publishedAt",
      "product",
      "promotion",
    ];
    for (const field of fields) {
      if (body[field] !== undefined) (piece as any)[field] = body[field];
    }

    // Al editar NO se re-slubea la campaña aunque cambie el título: el slug es
    // la identidad que ya está en los links publicados y en los leads
    // guardados. Cambiarlo partiría las métricas en dos. Si querés empezar de
    // cero para un título nuevo, borrá la pieza y creala de nuevo.
    if (body.campaign !== undefined) {
      piece.campaign = body.campaign || undefined;
    }

    if (body.scheduledFor !== undefined) {
      piece.scheduledFor = body.scheduledFor
        ? new Date(body.scheduledFor)
        : null;
    }

    // Al marcar como publicado sin fecha explícita, se sella la fecha. Es lo
    // que permite después medir "cuánto tardó en publicarse".
    if (body.status === "publicado") {
      if (!piece.publishedAt) piece.publishedAt = new Date();
    } else if (body.status && body.status !== "publicado") {
      piece.publishedAt = null;
    }

    if (body.results) {
      piece.set("results", {
        reach: Number(body.results.reach) || 0,
        interactions: Number(body.results.interactions) || 0,
      });
    }

    await piece.save();
    return NextResponse.json({ success: true, piece });
  } catch (error: any) {
    console.error("Error al actualizar contenido:", error);
    return NextResponse.json(
      { success: false, error: "Error interno" },
      { status: 500 }
    );
  }
}

// DELETE /api/content
export async function DELETE(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Falta el id" },
        { status: 400 }
      );
    }

    const deleted = await ContentPiece.findOneAndDelete({ _id: id, user: _id });
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "No se encontró la pieza" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error al eliminar contenido:", error);
    return NextResponse.json(
      { success: false, error: "Error interno" },
      { status: 500 }
    );
  }
}