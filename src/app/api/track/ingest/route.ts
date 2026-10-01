import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Store from "@/models/Store";
import Campaign, { ICampaign } from "@/models/Campaign";
import { TOUCH_COOKIE, CAMPAIGN_COOKIE, TOUCH_MAX_AGE } from "@/track/cookies";

connectDB();

function normalizeUtm(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.trim().toLowerCase();
  return clean.length > 0 ? clean.slice(0, 100) : undefined;
}

// POST /api/track/ingest
// Resuelve (o crea) la campaña de la visita y la deja en cookie.
// NO registra vistas: eso ya lo hace analytics/view/public/[slug], que
// ahora lee la cookie de campaña para atribuir.
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const slug = body?.slug;

    if (!slug) {
      return NextResponse.json(
        { success: false, message: "slug requerido" },
        { status: 400 }
      );
    }

    // La tienda acota la atribución: una visita nunca crea campañas
    // en el store de otro usuario.
    const store = await Store.findOne({ slug, isActive: true });
    if (!store) {
      return NextResponse.json(
        { success: false, message: "Tienda no encontrada" },
        { status: 404 }
      );
    }

    const utmSource = normalizeUtm(body?.utmSource);
    const utmMedium = normalizeUtm(body?.utmMedium);
    const utmCampaign = normalizeUtm(body?.utmCampaign);

    let campaign: ICampaign | null = null;

    if (utmSource || utmMedium || utmCampaign) {
      const name = utmCampaign || utmSource || "sin nombre";

      campaign = await Campaign.findOne({
        user: store.user,
        store: store._id,
        name,
      });

      if (!campaign) {
        campaign = await Campaign.create({
          name,
          channel: utmSource || "otro",
          utmMedium,
          status: "activa",
          user: store.user,
          store: store._id,
        });
      }
    }

    // First touch: si ya había cookie no se sobreescribe.
    // Se guarda epoch en ms (no ISO) porque es lo que Parsea leads/route al
    // reconstruir firstTouchAt. Una cookie corrupta se descarta en vez de
    // romper el request.
    const existingTouchRaw = req.cookies.get(TOUCH_COOKIE)?.value;
    const existingTouchMs = existingTouchRaw ? Number(existingTouchRaw) : NaN;
    const touchMs =
      Number.isFinite(existingTouchMs) && existingTouchMs > 0
        ? existingTouchMs
        : Date.now();

    // La campaña atribuida es la ya guardada, NO la de esta UTM. Si alguien
    // vuelve con otra campaña y el store page reinyecta el id desde la
    // respuesta, devolver la nueva rompería el first touch (el body del
    // lead tiene prioridad sobre la cookie).
    const existingCampaignRaw = req.cookies.get(CAMPAIGN_COOKIE)?.value;
    const attributed =
      campaign && !existingCampaignRaw
        ? campaign
        : existingCampaignRaw
          ? await Campaign.findOne({
              _id: existingCampaignRaw,
              user: store.user,
              store: store._id,
            })
          : null;

    const response = NextResponse.json({
      success: true,
      campaign: attributed ? { id: attributed._id, name: attributed.name } : null,
      firstTouch: new Date(touchMs).toISOString(),
    });

    response.cookies.set(TOUCH_COOKIE, String(touchMs), {
      maxAge: TOUCH_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });

    // La campaña solo se escribe si todavía no había una: preserva el
    // primer origen conocido aunque el visitante vuelva con otra UTM.
    if (attributed && !existingCampaignRaw) {
      response.cookies.set(CAMPAIGN_COOKIE, attributed._id.toString(), {
        maxAge: TOUCH_MAX_AGE,
        path: "/",
        sameSite: "lax",
      });
    }

    return response;
  } catch (error: any) {
    console.error("Error en track/ingest:", error);
    return NextResponse.json(
      { success: false, message: "Error interno" },
      { status: 500 }
    );
  }
}
