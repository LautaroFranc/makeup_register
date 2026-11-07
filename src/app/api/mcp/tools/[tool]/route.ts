import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Product from "@/models/Product";
import Combo from "@/models/Combo";
import Store from "@/models/Store";
import Users from "@/models/Users";
import { generateArgentineBarcode } from "@/lib/barcodeUtils";
import slugify from "slugify";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

connectDB();

async function resolveNovaContext() {
  await connectDB();
  let store: any = await Store.findOne({ slug: "nova-insumos", isActive: true });
  if (!store) {
    store = await Store.findOne({ slug: "nova-insumos" });
  }
  if (!store) {
    store = await Store.findOne({ name: { $regex: /nova/i }, isActive: true });
  }

  let storeId = "";
  let userId = "";

  if (store) {
    storeId = store._id.toString();
    userId = store.user ? store.user.toString() : "";
  } else {
    const user: any = await Users.findOne({ slug: "nova-insumos" });
    if (user) {
      userId = user._id.toString();
      const userStore: any = await Store.findOne({ user: user._id, isActive: true });
      if (userStore) storeId = userStore._id.toString();
    }
  }

  return { storeId, userId, storeName: store?.name || "Nova Insumos" };
}

function getStoreFilter(context: { storeId: string; userId: string }) {
  const conditions: any[] = [];
  if (context.storeId) {
    conditions.push({ store: context.storeId });
    try {
      conditions.push({ store: new mongoose.Types.ObjectId(context.storeId) });
    } catch {}
  }
  if (context.userId) {
    conditions.push({ user: context.userId });
    try {
      conditions.push({ user: new mongoose.Types.ObjectId(context.userId) });
    } catch {}
  }
  return { $or: conditions };
}

async function generateUniqueProductCode(prefix = "P") {
  const lastProduct = await Product.findOne().sort({ createdAt: -1 });
  const lastCode = lastProduct?.code || `${prefix}99`;
  const lastNumber = parseInt(lastCode.replace(prefix, "")) || 99;
  return `${prefix}${lastNumber + 1}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tool: string }> }
) {
  try {
    await connectDB();
    const { tool } = await params;
    const { searchParams } = new URL(req.url);
    const context = await resolveNovaContext();
    const storeFilter = getStoreFilter(context);

    // 1. LIST PRODUCTS
    if (tool === "list_products") {
      const search = searchParams.get("search");
      const category = searchParams.get("category");
      const brand = searchParams.get("brand");
      const stockStatus = searchParams.get("stockStatus") || "all";
      const limit = parseInt(searchParams.get("limit") || "50");

      const filterConditions: any[] = [storeFilter];

      if (search) {
        filterConditions.push({
          $or: [
            { name: { $regex: search, $options: "i" } },
            { brand: { $regex: search, $options: "i" } },
            { category: { $regex: search, $options: "i" } },
          ],
        });
      }

      if (category) {
        filterConditions.push({ category: { $regex: new RegExp(`^${category}$`, "i") } });
      }

      if (brand) {
        filterConditions.push({ brand: { $regex: new RegExp(`^${brand}$`, "i") } });
      }

      if (stockStatus === "in_stock") {
        filterConditions.push({ stock: { $gt: 0 } });
      } else if (stockStatus === "low_stock") {
        filterConditions.push({ stock: { $gt: 0, $lte: 5 } });
      } else if (stockStatus === "out_of_stock") {
        filterConditions.push({ stock: { $lte: 0 } });
      }

      const products = await Product.find({ $and: filterConditions })
        .sort({ createdAt: -1 })
        .limit(Math.min(limit, 100))
        .lean();

      const formatted = products.map((p: any) => ({
        id: p._id.toString(),
        name: p.name,
        code: p.code,
        barcode: p.barcode,
        category: p.category,
        brand: p.brand || "",
        buyPrice: parseFloat(p.buyPrice || "0"),
        sellPrice: parseFloat(p.sellPrice || "0"),
        wholesalePrice: parseFloat(p.wholesalePrice || "0"),
        stock: p.stock,
        published: p.published,
        hasDiscount: p.hasDiscount,
        discountPercentage: p.discountPercentage,
        views: p.views || 0,
      }));

      return NextResponse.json({
        tienda: context.storeName,
        totalResultados: formatted.length,
        productos: formatted,
      });
    }

    // 2. GET PRODUCT DETAIL
    if (tool === "get_product_detail") {
      const productId = searchParams.get("productId");
      if (!productId) {
        return NextResponse.json({ error: "productId es requerido" }, { status: 400 });
      }

      const isObjectId = productId.match(/^[0-9a-fA-F]{24}$/);
      const query = isObjectId ? { _id: productId } : { $or: [{ barcode: productId }, { code: productId }] };
      const product: any = await Product.findOne(query).lean();

      if (!product) {
        return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
      }

      return NextResponse.json({
        id: product._id.toString(),
        name: product.name,
        code: product.code,
        barcode: product.barcode,
        description: product.description,
        sections: product.sections || [],
        category: product.category,
        brand: product.brand,
        buyPrice: parseFloat(product.buyPrice),
        sellPrice: parseFloat(product.sellPrice),
        wholesalePrice: parseFloat(product.wholesalePrice || "0"),
        stock: product.stock,
        hasDiscount: product.hasDiscount,
        discountPercentage: product.discountPercentage,
        discountedPrice: product.discountedPrice,
        published: product.published,
        views: product.views || 0,
      });
    }

    // 3. LIST COMBOS
    if (tool === "list_combos") {
      const activeOnly = searchParams.get("activeOnly") === "true";
      const conditions: any[] = [storeFilter];
      if (activeOnly) {
        conditions.push({ isActive: true, published: true });
      }

      const combos = await Combo.find({ $and: conditions }).sort({ createdAt: -1 }).lean();
      const formatted = combos.map((c: any) => ({
        id: c._id.toString(),
        name: c.name,
        description: c.description || "",
        comboPrice: c.comboPrice,
        totalNormalPrice: c.totalNormalPrice,
        savings: c.savings,
        itemsCount: c.items?.length || 0,
        items: c.items,
        published: c.published,
        isActive: c.isActive,
      }));

      return NextResponse.json({
        tienda: context.storeName,
        totalCombos: formatted.length,
        combos: formatted,
      });
    }

    // 4. ANALYZE INVENTORY
    if (tool === "analyze_inventory") {
      const [products, combos] = await Promise.all([
        Product.find(storeFilter).lean(),
        Combo.find(storeFilter).lean(),
      ]);

      let totalValuationCost = 0;
      let totalValuationSell = 0;
      let totalStockUnits = 0;
      const outOfStockList: any[] = [];
      const lowStockList: any[] = [];
      const categoryCount: Record<string, number> = {};

      products.forEach((p: any) => {
        const stock = Number(p.stock) || 0;
        const buy = parseFloat(p.buyPrice || "0");
        const sell = parseFloat(p.sellPrice || "0");
        totalStockUnits += stock;
        totalValuationCost += stock * buy;
        totalValuationSell += stock * sell;

        if (stock <= 0) {
          outOfStockList.push({ id: p._id.toString(), name: p.name, category: p.category });
        } else if (stock <= 5) {
          lowStockList.push({ id: p._id.toString(), name: p.name, stock, category: p.category });
        }

        const cat = p.category || "Sin categoría";
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });

      const potentialGrossProfit = totalValuationSell - totalValuationCost;
      const overallMargin =
        totalValuationCost > 0
          ? ((potentialGrossProfit / totalValuationCost) * 100).toFixed(1) + "%"
          : "0%";

      return NextResponse.json({
        tienda: context.storeName,
        resumenInventario: {
          totalProductos: products.length,
          totalCombos: combos.length,
          unidadesTotalesEnStock: totalStockUnits,
          valorInventarioCostoARS: Math.round(totalValuationCost),
          valorInventarioVentaARS: Math.round(totalValuationSell),
          gananciaBrutaPotencialARS: Math.round(potentialGrossProfit),
          margenPromedioCatalogo: overallMargin,
        },
        alertasStock: {
          quiebresDeStock: { cantidad: outOfStockList.length, productos: outOfStockList },
          bajoStockAlerta: { cantidad: lowStockList.length, productos: lowStockList },
        },
        distribucionPorCategoria: categoryCount,
      });
    }

    return NextResponse.json({ error: `Herramienta '${tool}' no reconocida.` }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error en operación" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tool: string }> }
) {
  try {
    await connectDB();
    const { tool } = await params;
    const body = await req.json();
    const context = await resolveNovaContext();

    // 1. CREATE PRODUCT
    if (tool === "create_product") {
      const {
        name,
        sellPrice,
        buyPrice,
        stock,
        category,
        brand = "",
        description = "",
        sections = [],
        wholesalePrice = 0,
        hasDiscount = false,
        discountPercentage = 0,
        published = true,
      } = body;

      if (!name || sellPrice === undefined || buyPrice === undefined || stock === undefined || !category) {
        return NextResponse.json({ error: "Faltan campos obligatorios para el producto." }, { status: 400 });
      }

      const code = await generateUniqueProductCode();
      const barcode = generateArgentineBarcode("EAN13");
      const brandSlug = brand ? slugify(brand, { lower: true, strict: true }) : "";

      let discountedPrice = sellPrice;
      if (hasDiscount && discountPercentage > 0) {
        discountedPrice = sellPrice * (1 - discountPercentage / 100);
      }

      const newProduct: any = await Product.create({
        name,
        code,
        barcode,
        description,
        brand: brand.trim(),
        brandSlug,
        buyPrice: Number(buyPrice).toFixed(2),
        sellPrice: Number(sellPrice).toFixed(2),
        wholesalePrice: wholesalePrice ? Number(wholesalePrice).toFixed(2) : "0",
        discountedPrice: Number(discountedPrice).toFixed(2),
        hasDiscount: Boolean(hasDiscount),
        discountPercentage: Number(discountPercentage) || 0,
        stock: Number(stock),
        category,
        sections,
        published: published !== false,
        user: context.userId,
        store: context.storeId,
      });

      return NextResponse.json({
        mensaje: `Producto creado exitosamente en ${context.storeName}`,
        producto: {
          id: newProduct._id.toString(),
          name: newProduct.name,
          code: newProduct.code,
          barcode: newProduct.barcode,
          sellPrice: parseFloat(newProduct.sellPrice),
          buyPrice: parseFloat(newProduct.buyPrice),
          stock: newProduct.stock,
          category: newProduct.category,
          brand: newProduct.brand,
          sections: newProduct.sections,
        },
      });
    }

    // 2. UPDATE PRODUCT
    if (tool === "update_product") {
      const { productId, ...updates } = body;
      if (!productId) {
        return NextResponse.json({ error: "productId es requerido" }, { status: 400 });
      }

      const product: any = await Product.findById(productId);
      if (!product) {
        return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
      }

      if (updates.name !== undefined) product.name = updates.name;
      if (updates.description !== undefined) product.description = updates.description;
      if (updates.category !== undefined) product.category = updates.category;
      if (updates.stock !== undefined) product.stock = Number(updates.stock);
      if (updates.published !== undefined) product.published = updates.published;
      if (updates.sections !== undefined) product.sections = updates.sections;

      if (updates.brand !== undefined) {
        product.brand = updates.brand.trim();
        product.brandSlug = product.brand ? slugify(product.brand, { lower: true, strict: true }) : "";
      }

      if (updates.buyPrice !== undefined) product.buyPrice = Number(updates.buyPrice).toFixed(2);
      if (updates.sellPrice !== undefined) product.sellPrice = Number(updates.sellPrice).toFixed(2);
      if (updates.wholesalePrice !== undefined) product.wholesalePrice = Number(updates.wholesalePrice).toFixed(2);

      if (updates.hasDiscount !== undefined) product.hasDiscount = updates.hasDiscount;
      if (updates.discountPercentage !== undefined) product.discountPercentage = Number(updates.discountPercentage);

      const currentSell = parseFloat(product.sellPrice || "0");
      if (product.hasDiscount && product.discountPercentage > 0) {
        product.discountedPrice = (currentSell * (1 - product.discountPercentage / 100)).toFixed(2);
      } else {
        product.discountedPrice = product.sellPrice;
      }

      await product.save();

      return NextResponse.json({
        mensaje: "Producto actualizado correctamente",
        producto: {
          id: product._id.toString(),
          name: product.name,
          stock: product.stock,
          sellPrice: parseFloat(product.sellPrice),
          buyPrice: parseFloat(product.buyPrice),
        },
      });
    }

    // 3. CREATE COMBO
    if (tool === "create_combo") {
      const { name, comboPrice, items, description = "", published = true } = body;
      if (!name || comboPrice === undefined || !items || items.length === 0) {
        return NextResponse.json({ error: "Faltan campos obligatorios para el combo." }, { status: 400 });
      }

      const populatedItems: any[] = [];
      let totalNormalPrice = 0;

      for (const item of items) {
        const prod: any = await Product.findById(item.productId);
        if (!prod) {
          return NextResponse.json({ error: `Producto no encontrado ID ${item.productId}` }, { status: 404 });
        }
        const unitPrice = parseFloat(prod.sellPrice || "0");
        populatedItems.push({
          product: prod._id,
          productName: prod.name,
          quantity: item.quantity || 1,
          unitSellPrice: unitPrice,
        });
        totalNormalPrice += unitPrice * (item.quantity || 1);
      }

      const savings = Math.max(0, totalNormalPrice - Number(comboPrice));

      const newCombo: any = await Combo.create({
        name,
        description,
        items: populatedItems,
        totalNormalPrice,
        comboPrice: Number(comboPrice),
        savings,
        published: published !== false,
        isActive: true,
        user: context.userId,
        store: context.storeId,
      });

      return NextResponse.json({
        mensaje: `Combo creado exitosamente en ${context.storeName}`,
        combo: {
          id: newCombo._id.toString(),
          name: newCombo.name,
          comboPrice: newCombo.comboPrice,
          totalNormalPrice: newCombo.totalNormalPrice,
          savings: newCombo.savings,
        },
      });
    }

    return NextResponse.json({ error: `Herramienta '${tool}' no reconocida.` }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al procesar acción" }, { status: 500 });
  }
}
