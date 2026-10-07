import { NextRequest, NextResponse } from "next/server";
import Combo from "@/models/Combo";
import Product from "@/models/Product";
import Store from "@/models/Store";
import connectDB from "@/config/db";
import { authMiddleware } from "../middleware";

connectDB();

// GET — Listar combos del usuario
export async function GET(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id: userId } = (await authCheck.json()).user;

    const store = await Store.findOne({ user: userId, isActive: true });
    const query: any = { user: userId };
    if (store) query.store = store._id;

    const combos = await Combo.find(query).sort({ createdAt: -1 });

    // Enriquecer con stock actual de cada componente
    const combosWithStock = await Promise.all(
      combos.map(async (combo) => {
        const comboObj = combo.toObject();
        const itemsWithStock = await Promise.all(
          comboObj.items.map(async (item: any) => {
            const product = await Product.findById(item.product).select(
              "stock name published"
            );
            return {
              ...item,
              currentStock: product?.stock ?? 0,
              currentPublished: product?.published ?? false,
            };
          })
        );

        // Calcular si el combo tiene stock disponible
        const isAvailable = itemsWithStock.every(
          (item) => item.currentStock >= item.quantity
        );

        return { ...comboObj, items: itemsWithStock, isAvailable };
      })
    );

    return NextResponse.json({ success: true, combos: combosWithStock });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST — Crear combo
export async function POST(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id: userId } = (await authCheck.json()).user;

    const body = await req.json();
    const {
      name,
      description,
      image,
      items,
      comboPrice,
      published,
      allowOversell,
      autoHideWhenOutOfStock,
      startDate,
      endDate,
    } = body;

    if (!name || !items || items.length < 2) {
      return NextResponse.json(
        { success: false, error: "Se requiere nombre y al menos 2 productos" },
        { status: 400 }
      );
    }

    const store = await Store.findOne({ user: userId, isActive: true });
    if (!store) {
      return NextResponse.json(
        { success: false, error: "No se encontró tienda activa" },
        { status: 400 }
      );
    }

    // Validar y construir items con snapshot de precios
    const builtItems = [];
    let totalNormalPrice = 0;

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, user: userId });
      if (!product) {
        return NextResponse.json(
          { success: false, error: `Producto no encontrado: ${item.productId}` },
          { status: 400 }
        );
      }
      const unitPrice = parseFloat(product.sellPrice) || 0;
      totalNormalPrice += unitPrice * item.quantity;
      builtItems.push({
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitSellPrice: unitPrice,
      });
    }

    const comboPriceNum = parseFloat(comboPrice) || 0;
    const savings = totalNormalPrice - comboPriceNum;

    const combo = await Combo.create({
      name,
      description,
      image,
      items: builtItems,
      totalNormalPrice,
      comboPrice: comboPriceNum,
      savings,
      user: userId,
      store: store._id,
      published: published ?? true,
      isActive: true,
      allowOversell: allowOversell ?? false,
      autoHideWhenOutOfStock: autoHideWhenOutOfStock ?? true,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    return NextResponse.json({ success: true, combo }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT — Editar combo
export async function PUT(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id: userId } = (await authCheck.json()).user;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de combo requerido" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      name,
      description,
      image,
      items,
      comboPrice,
      published,
      isActive,
      allowOversell,
      autoHideWhenOutOfStock,
      startDate,
      endDate,
    } = body;

    const existing = await Combo.findOne({ _id: id, user: userId });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Combo no encontrado" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (published !== undefined) updateData.published = published;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (allowOversell !== undefined) updateData.allowOversell = allowOversell;
    if (autoHideWhenOutOfStock !== undefined)
      updateData.autoHideWhenOutOfStock = autoHideWhenOutOfStock;
    if (startDate !== undefined) updateData.startDate = startDate || null;
    if (endDate !== undefined) updateData.endDate = endDate || null;

    // Si se actualizan los items, recalcular precios
    if (items && items.length >= 2) {
      const builtItems = [];
      let totalNormalPrice = 0;

      for (const item of items) {
        const product = await Product.findOne({
          _id: item.productId,
          user: userId,
        });
        if (!product) {
          return NextResponse.json(
            { success: false, error: `Producto no encontrado: ${item.productId}` },
            { status: 400 }
          );
        }
        const unitPrice = parseFloat(product.sellPrice) || 0;
        totalNormalPrice += unitPrice * item.quantity;
        builtItems.push({
          product: product._id,
          productName: product.name,
          quantity: item.quantity,
          unitSellPrice: unitPrice,
        });
      }

      updateData.items = builtItems;
      updateData.totalNormalPrice = totalNormalPrice;
    }

    if (comboPrice !== undefined) {
      const comboPriceNum = parseFloat(comboPrice) || 0;
      updateData.comboPrice = comboPriceNum;
      updateData.savings =
        (updateData.totalNormalPrice ?? existing.totalNormalPrice) - comboPriceNum;
    }

    const updated = await Combo.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    return NextResponse.json({ success: true, combo: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE — Eliminar combo
export async function DELETE(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id: userId } = (await authCheck.json()).user;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de combo requerido" },
        { status: 400 }
      );
    }

    const deleted = await Combo.findOneAndDelete({ _id: id, user: userId });
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Combo no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Combo eliminado" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
