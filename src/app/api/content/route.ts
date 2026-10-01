import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import ContentPiece from "@/models/ContentPiece";
import Store from "@/models/Store";
import { authMiddleware } from "../middleware";

connectDB();

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

    const pieces = await ContentPiece.find(query).sort({
      scheduledFor: 1,
      createdAt: -1,
    });

    return NextResponse.json({ success: true, pieces });
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