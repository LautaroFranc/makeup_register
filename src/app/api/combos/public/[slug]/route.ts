import { NextRequest, NextResponse } from "next/server";
import Combo from "@/models/Combo";
import Product from "@/models/Product";
import Store from "@/models/Store";
import Users from "@/models/Users";
import connectDB from "@/config/db";

connectDB();

// GET — Listar combos públicos de una tienda por slug
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Slug requerido" },
        { status: 400 }
      );
    }

    // Buscar tienda por slug o usuario por slug (retrocompatibilidad)
    let userId: string;
    let storeId: string | null = null;

    const store = await Store.findOne({ slug, isActive: true, isPublic: true });
    if (store) {
      userId = store.user.toString();
      storeId = (store._id as any).toString();
    } else {
      const user = await Users.findOne({ slug });
      if (!user) {
        return NextResponse.json(
          { success: false, error: "Tienda no encontrada" },
          { status: 404 }
        );
      }
      userId = (user._id as any).toString();
    }

    const query: any = {
      user: userId,
      published: true,
      isActive: true,
    };
    if (storeId) query.store = storeId;

    // Filtrar combos activos (dentro del rango de fechas si aplica)
    const now = new Date();
    query.$and = [
      { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] },
    ];

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    if (search) {
      query.$and.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      });
    }

    const combos = await Combo.find(query).sort({ createdAt: -1 });

    // Para cada combo, verificar disponibilidad real de stock
    const publicCombos = await Promise.all(
      combos.map(async (combo) => {
        const comboObj = combo.toObject();

        // Verificar stock actual de cada componente
        let isAvailable = true;
        const itemsWithAvailability = await Promise.all(
          comboObj.items.map(async (item: any) => {
            const product = await Product.findById(item.product).select(
              "stock published"
            );
            const hasStock = (product?.stock ?? 0) >= item.quantity;
            const isPublished = product?.published ?? false;

            if (!hasStock || !isPublished) isAvailable = false;

            return {
              productId: item.product,
              productName: item.productName,
              quantity: item.quantity,
              unitSellPrice: item.unitSellPrice,
            };
          })
        );

        // Si autoHideWhenOutOfStock=true y no hay stock → omitir este combo
        if (comboObj.autoHideWhenOutOfStock && !isAvailable && !comboObj.allowOversell) {
          return null;
        }

        return {
          _id: comboObj._id,
          name: comboObj.name,
          description: comboObj.description,
          image: comboObj.image,
          items: itemsWithAvailability,
          totalNormalPrice: comboObj.totalNormalPrice,
          comboPrice: comboObj.comboPrice,
          savings: comboObj.savings,
          savingsPercent:
            comboObj.totalNormalPrice > 0
              ? Math.round((comboObj.savings / comboObj.totalNormalPrice) * 100)
              : 0,
          isAvailable,
          allowOversell: comboObj.allowOversell, // el cliente sabe si puede comprar en pre-venta
          startDate: comboObj.startDate,
          endDate: comboObj.endDate,
        };
      })
    );

    // Filtrar nulls (combos ocultos por falta de stock)
    const visibleCombos = publicCombos.filter(Boolean);

    return NextResponse.json({ success: true, combos: visibleCombos });
  } catch (error: any) {
    console.error("Error fetching public combos:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
