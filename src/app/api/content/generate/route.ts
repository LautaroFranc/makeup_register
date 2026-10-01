import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Store from "@/models/Store";
import Product from "@/models/Product";
import Promotion from "@/models/Promotion";
import GlobalDiscount from "@/models/GlobalDiscount";
import ContentPiece from "@/models/ContentPiece";
import { generateIdeas } from "@/lib/contentIdeas";
import { authMiddleware } from "../../middleware";

connectDB();

// POST /api/content/generate
// Arma ideas a partir de los datos reales de la tienda.
//
// No crea nada: devuelve candidatos y la UI deja elegir cuáles guardar. Si
// guardara solo, cada corrida te llenaría el calendario de duplicados.
export async function POST(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const body = await req.json().catch(() => ({}));
    const storeId = body?.storeId;

    const store = await Store.findOne(
      storeId ? { _id: storeId, user: _id } : { user: _id, isActive: true }
    );
    if (!store) {
      return NextResponse.json(
        { success: false, error: "No se encontró una tienda para el usuario" },
        { status: 404 }
      );
    }

    const [products, promotions, globalDiscount, existing] = await Promise.all([
      Product.find({ user: _id, store: store._id.toString(), published: true }).select(
        "name description stock sellPrice discountedPrice hasDiscount discountPercentage category views"
      ),
      Promotion.find({ user: _id, isActive: true }).select(
        "name type productName specialPrice startDate endDate isActive"
      ),
      GlobalDiscount.findOne({ user: _id, store: store._id, isActive: true }).select(
        "name discountPercentage description endDate isActive"
      ),
      // Solo para marcar cuáles ya tenés cargadas.
      ContentPiece.find({ user: _id, store: store._id }).select("title scheduledFor status"),
    ]);

    const ideas = generateIdeas({
      products: products.map((p) => ({
        // Product no declara _id en su interfaz, así que el tipo viene como
        // unknown: se normaliza acá una sola vez.
        _id: String(p._id),
        name: p.name,
        description: p.description,
        stock: p.stock,
        sellPrice: p.sellPrice,
        discountedPrice: p.discountedPrice,
        hasDiscount: p.hasDiscount,
        discountPercentage: p.discountPercentage,
        category: p.category,
        published: p.published,
        views: p.views,
      })),
      promotions: promotions.map((pr) => ({
        _id: String(pr._id),
        name: pr.name,
        type: pr.type,
        productName: pr.productName,
        specialPrice: pr.specialPrice,
        startDate: pr.startDate,
        endDate: pr.endDate,
        isActive: pr.isActive,
      })),
      globalDiscount: globalDiscount
        ? {
            name: globalDiscount.name,
            discountPercentage: globalDiscount.discountPercentage,
            description: globalDiscount.description,
            endDate: globalDiscount.endDate,
            isActive: globalDiscount.isActive,
          }
        : null,
      // Sin link en la app: el usuario tiene sus redes en Store, no acá.
      whatsappUrl: undefined,
    });

    // Marca las ideas cuyo título ya existe en el calendario.
    const titles = new Set(existing.map((e) => e.title.trim().toLowerCase()));
    const withFlag = ideas.map((idea) => ({
      ...idea,
      alreadyPlanned: titles.has(idea.title.trim().toLowerCase()),
    }));

    return NextResponse.json({
      success: true,
      ideas: withFlag,
      context: {
        productos: products.length,
        promociones: promotions.length,
        descuentoGeneral: !!globalDiscount,
        piezasExistentes: existing.length,
      },
    });
  } catch (error: any) {
    console.error("Error al generar ideas:", error);
    return NextResponse.json(
      { success: false, error: "Error interno" },
      { status: 500 }
    );
  }
}