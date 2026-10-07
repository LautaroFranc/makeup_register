import { NextRequest, NextResponse } from "next/server";
import FutureProduct from "@/models/FutureProduct";
import Product from "@/models/Product";
import Store from "@/models/Store";
import connectDB from "@/config/db";
import { authMiddleware } from "../middleware";
import { generateArgentineBarcode } from "@/lib/barcodeUtils";

connectDB();

async function generateUniqueProductCode(prefix = "P") {
  const lastProduct = await Product.findOne().sort({ createdAt: -1 });
  const lastCode = lastProduct?.code || `${prefix}99`;
  const lastNumber = parseInt(lastCode.replace(prefix, "")) || 99;
  return `${prefix}${lastNumber + 1}`;
}

// ─── GET: listar futuros productos ────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id: userId } = (await authCheck.json()).user;

    const store = await Store.findOne({ user: userId, isActive: true });
    if (!store) return NextResponse.json({ success: false, error: "Tienda no encontrada" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const filter: Record<string, any> = { user: userId, store: store._id };
    if (status) filter.status = status;

    const items = await FutureProduct.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── POST: crear futuro producto ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id: userId } = (await authCheck.json()).user;

    const store = await Store.findOne({ user: userId, isActive: true });
    if (!store) return NextResponse.json({ success: false, error: "Tienda no encontrada" }, { status: 400 });

    const body = await req.json();
    const { productCost = 0, shippingCost = 0, otherCosts = 0, suggestedSellPrice } = body;

    const totalCost = productCost + shippingCost + otherCosts;
    const estimatedMargin =
      suggestedSellPrice && totalCost > 0
        ? Math.round(((suggestedSellPrice - totalCost) / suggestedSellPrice) * 100)
        : undefined;

    const item = await FutureProduct.create({
      ...body,
      user: userId,
      store: store._id,
      totalCost,
      estimatedMargin,
    });

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── PUT: actualizar ─────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id: userId } = (await authCheck.json()).user;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "Falta id" }, { status: 400 });

    const body = await req.json();
    const { productCost, shippingCost, otherCosts, suggestedSellPrice } = body;

    const existing = await FutureProduct.findOne({ _id: id, user: userId });
    if (!existing) return NextResponse.json({ success: false, error: "No encontrado" }, { status: 404 });

    const pc = productCost ?? existing.productCost;
    const sc = shippingCost ?? existing.shippingCost;
    const oc = otherCosts ?? existing.otherCosts;
    const sp = suggestedSellPrice ?? existing.suggestedSellPrice;

    const totalCost = pc + sc + oc;
    const estimatedMargin =
      sp && totalCost > 0 ? Math.round(((sp - totalCost) / sp) * 100) : undefined;

    const updated = await FutureProduct.findByIdAndUpdate(
      id,
      { $set: { ...body, totalCost, estimatedMargin } },
      { new: true, runValidators: true }
    );

    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── DELETE: eliminar ─────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id: userId } = (await authCheck.json()).user;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "Falta id" }, { status: 400 });

    await FutureProduct.findOneAndDelete({ _id: id, user: userId });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
