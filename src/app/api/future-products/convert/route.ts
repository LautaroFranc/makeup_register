import { NextRequest, NextResponse } from "next/server";
import FutureProduct from "@/models/FutureProduct";
import Product from "@/models/Product";
import Store from "@/models/Store";
import connectDB from "@/config/db";
import { authMiddleware } from "../../middleware";
import { generateArgentineBarcode } from "@/lib/barcodeUtils";

connectDB();

async function generateUniqueProductCode(prefix = "P") {
  const lastProduct = await Product.findOne().sort({ createdAt: -1 });
  const lastCode = lastProduct?.code || `${prefix}99`;
  const lastNumber = parseInt(lastCode.replace(prefix, "")) || 99;
  return `${prefix}${lastNumber + 1}`;
}

// POST /api/future-products/convert?id=<futureProductId>
// Convierte un futuro producto en producto real del catálogo
export async function POST(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id: userId } = (await authCheck.json()).user;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "Falta id" }, { status: 400 });

    const future = await FutureProduct.findOne({ _id: id, user: userId });
    if (!future) return NextResponse.json({ success: false, error: "Futuro producto no encontrado" }, { status: 404 });
    if (future.convertedProductId) {
      return NextResponse.json({ success: false, error: "Este producto ya fue convertido" }, { status: 400 });
    }

    const store = await Store.findOne({ user: userId, isActive: true });
    if (!store) return NextResponse.json({ success: false, error: "Tienda no encontrada" }, { status: 400 });

    // Leer overrides del body (precio de venta final, stock inicial, etc.)
    const body = await req.json().catch(() => ({}));
    const sellPrice = body.sellPrice ?? future.suggestedSellPrice ?? future.totalCost;
    const buyPrice = body.buyPrice ?? future.totalCost;
    const stock = body.stock ?? 0;
    const wholesalePrice = body.wholesalePrice ?? future.suggestedWholesalePrice ?? sellPrice;

    const code = await generateUniqueProductCode();
    let barcode = generateArgentineBarcode("EAN13");

    // Verificar unicidad del barcode (reintento simple)
    const barcodeExists = await Product.findOne({ barcode });
    if (barcodeExists) barcode = generateArgentineBarcode("EAN13");

    const newProduct = await Product.create({
      code,
      barcode,
      name: future.name,
      description: future.description || "",
      category: future.category || "General",
      buyPrice: String(buyPrice),
      sellPrice: String(sellPrice),
      wholesalePrice: String(wholesalePrice),
      stock,
      published: false, // arranca despublicado para que el usuario lo revise antes
      user: userId,
      store: store._id.toString(),
      image: null,
      images: [],
      attributes: {},
      hasDiscount: false,
      discountPercentage: 0,
      discountedPrice: String(sellPrice),
    });

    // Marcar el futuro producto como convertido
    await FutureProduct.findByIdAndUpdate(id, {
      $set: {
        status: "aprobado",
        convertedProductId: String(newProduct._id),
        convertedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      product: newProduct,
      message: `"${future.name}" fue agregado al catálogo como borrador (despublicado).`,
    });
  } catch (err: any) {
    console.error("Error convirtiendo futuro producto:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
