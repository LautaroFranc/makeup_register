import { NextRequest, NextResponse } from "next/server";
import Combo from "@/models/Combo";
import Product from "@/models/Product";
import SaleProduct from "@/models/SaleProduct";
import Store from "@/models/Store";
import Users from "@/models/Users";
import connectDB from "@/config/db";

connectDB();

// POST — Registrar venta de un combo (pública, por slug de tienda)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Resolver tienda o usuario por slug
    let userId: string;
    let storeId: string | null = null;

    const store = await Store.findOne({ slug, isActive: true, isPublic: true });
    if (store) {
      userId = store.user.toString();
      storeId = (store._id as any).toString();

      // Validar dominio si hay restricción CORS en la tienda
      const origin = req.headers.get("origin") || req.headers.get("referer") || "";
      const allowedDomains = store.settings?.allowedDomains || [];
      if (allowedDomains.length > 0) {
        const isAllowed = allowedDomains.some((domain: string) =>
          origin.includes(domain)
        );
        if (!isAllowed) {
          return NextResponse.json(
            { success: false, message: "Dominio no autorizado" },
            { status: 403 }
          );
        }
      }

      // Validar token de integración si existe
      const integrationToken = store.settings?.integrationToken;
      if (integrationToken && integrationToken.trim() !== "") {
        const authHeader = req.headers.get("authorization");
        if (!authHeader || authHeader !== `Bearer ${integrationToken}`) {
          return NextResponse.json(
            { success: false, message: "Token de integración inválido" },
            { status: 401 }
          );
        }
      }
    } else {
      const user = await Users.findOne({ slug });
      if (!user) {
        return NextResponse.json(
          { success: false, message: "Tienda no encontrada" },
          { status: 404 }
        );
      }
      userId = (user._id as any).toString();
    }

    const body = await req.json();
    const comboId = body.comboId;
    const quantity = parseInt(body.quantity ?? "1") || 1;

    if (!comboId) {
      return NextResponse.json(
        { success: false, message: "comboId es requerido" },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { success: false, message: "La cantidad debe ser mayor a 0" },
        { status: 400 }
      );
    }

    // Buscar el combo y validar que pertenezca a esta tienda/usuario
    const combo = await Combo.findOne({
      _id: comboId,
      user: userId,
      isActive: true,
      published: true,
      ...(storeId ? { store: storeId } : {}),
    });

    if (!combo) {
      return NextResponse.json(
        { success: false, message: "Combo no encontrado o no disponible" },
        { status: 404 }
      );
    }

    // Validar fechas de vigencia
    const now = new Date();
    if (combo.startDate && combo.startDate > now) {
      return NextResponse.json(
        { success: false, message: "Este combo aún no está disponible" },
        { status: 400 }
      );
    }
    if (combo.endDate && combo.endDate < now) {
      return NextResponse.json(
        { success: false, message: "Este combo ya no está disponible" },
        { status: 400 }
      );
    }

    // ── PASO 1: Verificar stock de todos los componentes ────────────────
    const stockIssues: string[] = [];
    let isBackorder = false;

    for (const item of combo.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return NextResponse.json(
          { success: false, message: `Producto no encontrado: ${item.productName}` },
          { status: 400 }
        );
      }

      const needed = item.quantity * quantity;
      if (product.stock < needed) {
        if (combo.allowOversell) {
          // Registrar la deuda pero continuar
          isBackorder = true;
        } else {
          stockIssues.push(
            `${item.productName}: stock insuficiente (disponible: ${product.stock}, necesario: ${needed})`
          );
        }
      }
    }

    if (stockIssues.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Stock insuficiente en algunos componentes del combo",
          stockIssues,
        },
        { status: 400 }
      );
    }

    // ── PASO 2: Descontar stock y registrar ventas ───────────────────────
    const sales = [];

    for (const item of combo.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;

      const needed = item.quantity * quantity;
      const newStock = product.stock - needed; // puede quedar negativo si allowOversell=true

      await Product.updateOne(
        { _id: item.product },
        { $set: { stock: newStock } }
      );

      const sale = await SaleProduct.create({
        idProduct: item.product.toString(),
        stock: needed,
        sellPrice: String((combo.comboPrice / combo.items.reduce(
          (acc, i) => acc + i.quantity * i.unitSellPrice,
          0
        ) * item.unitSellPrice * item.quantity).toFixed(2)),
        user: userId,
        isPublicSale: true,
        // comboId y isBackorder son campos opcionales que no rompen el schema
        // pero pueden enriquecerse en el futuro extendiendo SaleProduct
      });

      sales.push({
        saleId: (sale._id as any).toString(),
        productId: item.product.toString(),
        productName: item.productName,
        quantity: needed,
        stockRestante: newStock,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: isBackorder
          ? `Combo vendido en modo pre-venta. Se repondrá el stock próximamente.`
          : `Combo "${combo.name}" vendido exitosamente`,
        combo: {
          _id: (combo._id as any).toString(),
          name: combo.name,
          comboPrice: combo.comboPrice,
          quantity,
        },
        sales,
        isBackorder,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al vender combo:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
