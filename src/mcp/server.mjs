#!/usr/bin/env node

/**
 * Servidor MCP (Model Context Protocol) para Gestión de Inventario, Productos y Combos.
 * Compatible con Claude Desktop, ChatGPT y cualquier cliente MCP.
 * 
 * Transport: stdio (JSON-RPC)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import mongoose, { Schema } from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import slugify from "slugify";

// Redirigir console.log a console.error para no corromper el canal stdio JSON-RPC
const originalLog = console.log;
console.log = (...args) => console.error(...args);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("ERROR: Variable MONGO_URI no encontrada en .env");
  process.exit(1);
}

// ─── MODELOS MONGOOSE LIGEROS PARA EL MCP ─────────────────────────────────────

const ProductSchema = new Schema(
  {
    code: { type: String, required: true },
    barcode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    brand: { type: String, default: "" },
    brandSlug: { type: String, default: "" },
    image: { type: String },
    images: { type: [String], default: [] },
    attributes: { type: Schema.Types.Mixed, default: {} },
    sections: {
      type: [
        {
          title: { type: String, required: true },
          content: { type: String, required: true },
        },
      ],
      default: [],
    },
    buyPrice: { type: String, required: true },
    sellPrice: { type: String, required: true },
    wholesalePrice: { type: String, default: "0" },
    stock: { type: Number, required: true, default: 0 },
    category: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    store: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    published: { type: Boolean, default: true },
    hasDiscount: { type: Boolean, default: false },
    discountPercentage: { type: Number, default: 0 },
    discountedPrice: { type: String, default: "0" },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ComboItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unitSellPrice: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const ComboSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    items: [ComboItemSchema],
    totalNormalPrice: { type: Number, required: true, default: 0 },
    comboPrice: { type: Number, required: true, default: 0 },
    savings: { type: Number, default: 0 },
    user: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    store: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    published: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const StoreSchema = new Schema(
  {
    name: { type: String },
    slug: { type: String },
    user: { type: Schema.Types.ObjectId, ref: "Users" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const UserSchema = new Schema(
  {
    name: { type: String },
    slug: { type: String },
    email: { type: String },
  },
  { timestamps: true }
);

const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);
const Combo = mongoose.models.Combo || mongoose.model("Combo", ComboSchema);
const Store = mongoose.models.Store || mongoose.model("Store", StoreSchema);
const User = mongoose.models.Users || mongoose.model("Users", UserSchema);

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function ensureDB() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI);
  console.error("Conectado a MongoDB para el servidor MCP.");
}

async function resolveStoreContext(slugInput = "nova-insumos") {
  await ensureDB();
  const targetSlug = slugInput?.trim().toLowerCase() || "nova-insumos";

  let store = await Store.findOne({ slug: targetSlug, isActive: true });
  if (!store) {
    store = await Store.findOne({ slug: targetSlug });
  }
  if (!store) {
    store = await Store.findOne({ name: { $regex: /nova/i }, isActive: true });
  }

  let userId = "";
  let storeId = "";

  if (store) {
    storeId = store._id.toString();
    userId = store.user ? store.user.toString() : "";
  } else {
    const user = await User.findOne({ slug: targetSlug });
    if (user) {
      userId = user._id.toString();
      const userStore = await Store.findOne({ user: user._id, isActive: true });
      if (userStore) storeId = userStore._id.toString();
    }
  }

  if (!storeId && !userId) {
    throw new Error(`No se encontró la tienda para el slug '${targetSlug}'.`);
  }

  return {
    storeId,
    userId,
    storeName: store?.name || "Nova Insumos",
  };
}

function getStoreFilter(context) {
  const conditions = [];
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

function calculateEAN13CheckDigit(code) {
  let sum = 0;
  for (let i = 0; i < code.length; i += 2) sum += parseInt(code[i]);
  for (let i = 1; i < code.length; i += 2) sum += parseInt(code[i]) * 3;
  const rem = sum % 10;
  return rem === 0 ? "0" : (10 - rem).toString();
}

function generateArgentineBarcode() {
  const prefix = "779";
  const productCode = Math.floor(Math.random() * 1000000000)
    .toString()
    .padStart(9, "0");
  const codeWithoutCheck = prefix + productCode;
  return codeWithoutCheck + calculateEAN13CheckDigit(codeWithoutCheck);
}

async function generateUniqueProductCode(prefix = "P") {
  const lastProduct = await Product.findOne().sort({ createdAt: -1 });
  const lastCode = lastProduct?.code || `${prefix}99`;
  const lastNumber = parseInt(lastCode.replace(prefix, "")) || 99;
  return `${prefix}${lastNumber + 1}`;
}

// ─── INICIALIZACIÓN DEL SERVIDOR MCP ─────────────────────────────────────────

const server = new McpServer({
  name: "makeup-inventory-mcp",
  version: "1.0.0",
});

// 1. LISTAR PRODUCTOS (FILTRADO ESTRICTAMENTE POR NOVA INSUMOS)
server.tool(
  "list_products",
  "Lista productos del catálogo exclusivamente de la tienda activa (por defecto Nova Insumos). Permite buscar, filtrar por categoría, marca o stock.",
  {
    search: z.string().optional().describe("Texto para buscar en nombre, marca o descripción"),
    category: z.string().optional().describe("Filtrar por categoría (ej: Peluquería, Uñas, Rostro)"),
    brand: z.string().optional().describe("Filtrar por marca"),
    stockStatus: z
      .enum(["all", "in_stock", "low_stock", "out_of_stock"])
      .optional()
      .describe("Filtrar por estado de stock (low_stock: 5 unidades o menos)"),
    limit: z.number().optional().default(50).describe("Límite de productos a retornar (máx 100)"),
    storeSlug: z
      .string()
      .optional()
      .default("nova-insumos")
      .describe("Slug de la tienda a consultar. Por defecto: 'nova-insumos'"),
  },
  async ({ search, category, brand, stockStatus = "all", limit = 50, storeSlug = "nova-insumos" }) => {
    await ensureDB();
    const context = await resolveStoreContext(storeSlug);
    const storeFilter = getStoreFilter(context);

    const filterConditions = [storeFilter];

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

    const finalQuery = { $and: filterConditions };
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const products = await Product.find(finalQuery)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean();

    const formatted = products.map((p) => {
      const buy = parseFloat(p.buyPrice || "0");
      const sell = parseFloat(p.sellPrice || "0");
      const margin = buy > 0 ? (((sell - buy) / buy) * 100).toFixed(1) + "%" : "N/A";
      return {
        id: p._id.toString(),
        name: p.name,
        code: p.code,
        barcode: p.barcode,
        category: p.category,
        brand: p.brand || "",
        buyPrice: buy,
        sellPrice: sell,
        wholesalePrice: parseFloat(p.wholesalePrice || "0"),
        margin,
        stock: p.stock,
        published: p.published,
        hasDiscount: p.hasDiscount,
        discountPercentage: p.discountPercentage,
        views: p.views || 0,
      };
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              tienda: context.storeName,
              slug: storeSlug,
              totalResultados: formatted.length,
              productos: formatted,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// 2. OBTENER DETALLE COMPLETO DE UN PRODUCTO
server.tool(
  "get_product_detail",
  "Obtiene la ficha técnica y detalle completo de un producto por ID o código de barras, incluyendo secciones (acordeones), atributos y precios.",
  {
    productId: z.string().describe("ID de MongoDB o código de barras del producto"),
  },
  async ({ productId }) => {
    await ensureDB();
    const isObjectId = mongoose.Types.ObjectId.isValid(productId);
    const query = isObjectId ? { _id: productId } : { $or: [{ barcode: productId }, { code: productId }] };

    const product = await Product.findOne(query).lean();
    if (!product) {
      return {
        content: [{ type: "text", text: `Error: No se encontró el producto con identificador "${productId}".` }],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
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
              attributes: product.attributes || {},
              hasDiscount: product.hasDiscount,
              discountPercentage: product.discountPercentage,
              discountedPrice: product.discountedPrice,
              published: product.published,
              views: product.views || 0,
              images: product.images || [],
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// 3. CREAR UN PRODUCTO
server.tool(
  "create_product",
  "Crea un nuevo producto en Nova Insumos con código interno y código de barras argentino EAN-13 generados automáticamente.",
  {
    name: z.string().describe("Nombre del producto"),
    sellPrice: z.number().describe("Precio de venta al público en ARS"),
    buyPrice: z.number().describe("Precio de costo / compra en ARS"),
    stock: z.number().describe("Stock inicial"),
    category: z.string().describe("Categoría principal (ej: Peluquería, Manicuría, etc.)"),
    brand: z.string().optional().describe("Marca del producto"),
    description: z.string().optional().describe("Descripción general"),
    sections: z
      .array(
        z.object({
          title: z.string().describe("Título de la sección (ej: Resultados y Beneficios, Modo de uso)"),
          content: z.string().describe("Contenido detallado de la sección"),
        })
      )
      .optional()
      .describe("Secciones o acordeones de información (Resultados, Modo de uso, Ingredientes)"),
    wholesalePrice: z.number().optional().describe("Precio mayorista en ARS"),
    hasDiscount: z.boolean().optional().default(false).describe("Si tiene descuento activo"),
    discountPercentage: z.number().optional().default(0).describe("Porcentaje de descuento"),
    published: z.boolean().optional().default(true).describe("Visibilidad pública en la tienda"),
    storeSlug: z.string().optional().default("nova-insumos").describe("Slug de la tienda destino. Por defecto 'nova-insumos'"),
  },
  async ({
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
    storeSlug = "nova-insumos",
  }) => {
    await ensureDB();
    const context = await resolveStoreContext(storeSlug);

    const code = await generateUniqueProductCode();
    const barcode = generateArgentineBarcode();
    const brandSlug = brand ? slugify(brand, { lower: true, strict: true }) : "";

    let discountedPrice = sellPrice;
    if (hasDiscount && discountPercentage > 0) {
      discountedPrice = sellPrice * (1 - discountPercentage / 100);
    }

    const newProduct = await Product.create({
      name,
      code,
      barcode,
      description,
      brand: brand.trim(),
      brandSlug,
      buyPrice: buyPrice.toFixed(2),
      sellPrice: sellPrice.toFixed(2),
      wholesalePrice: wholesalePrice ? wholesalePrice.toFixed(2) : "0",
      discountedPrice: discountedPrice.toFixed(2),
      hasDiscount,
      discountPercentage,
      stock,
      category,
      sections,
      published,
      user: context.userId,
      store: context.storeId,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
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
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// 4. EDITAR UN PRODUCTO
server.tool(
  "update_product",
  "Modifica los datos de un producto existente (precios, stock, descripción, secciones/acordeones, descuentos o visibilidad).",
  {
    productId: z.string().describe("ID de MongoDB del producto a editar"),
    name: z.string().optional(),
    sellPrice: z.number().optional(),
    buyPrice: z.number().optional(),
    wholesalePrice: z.number().optional(),
    stock: z.number().optional(),
    category: z.string().optional(),
    brand: z.string().optional(),
    description: z.string().optional(),
    sections: z
      .array(
        z.object({
          title: z.string(),
          content: z.string(),
        })
      )
      .optional()
      .describe("Reemplaza o actualiza las secciones de acordeón"),
    hasDiscount: z.boolean().optional(),
    discountPercentage: z.number().optional(),
    published: z.boolean().optional(),
  },
  async ({ productId, ...updates }) => {
    await ensureDB();

    const product = await Product.findById(productId);
    if (!product) {
      return {
        content: [{ type: "text", text: `Error: No se encontró el producto con ID "${productId}".` }],
      };
    }

    if (updates.name !== undefined) product.name = updates.name;
    if (updates.description !== undefined) product.description = updates.description;
    if (updates.category !== undefined) product.category = updates.category;
    if (updates.stock !== undefined) product.stock = updates.stock;
    if (updates.published !== undefined) product.published = updates.published;
    if (updates.sections !== undefined) product.sections = updates.sections;

    if (updates.brand !== undefined) {
      product.brand = updates.brand.trim();
      product.brandSlug = product.brand ? slugify(product.brand, { lower: true, strict: true }) : "";
    }

    if (updates.buyPrice !== undefined) product.buyPrice = updates.buyPrice.toFixed(2);
    if (updates.sellPrice !== undefined) product.sellPrice = updates.sellPrice.toFixed(2);
    if (updates.wholesalePrice !== undefined) product.wholesalePrice = updates.wholesalePrice.toFixed(2);

    if (updates.hasDiscount !== undefined) product.hasDiscount = updates.hasDiscount;
    if (updates.discountPercentage !== undefined) product.discountPercentage = updates.discountPercentage;

    // Recalcular discountedPrice
    const currentSell = parseFloat(product.sellPrice || "0");
    if (product.hasDiscount && product.discountPercentage > 0) {
      product.discountedPrice = (currentSell * (1 - product.discountPercentage / 100)).toFixed(2);
    } else {
      product.discountedPrice = product.sellPrice;
    }

    await product.save();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              mensaje: "Producto actualizado correctamente",
              producto: {
                id: product._id.toString(),
                name: product.name,
                stock: product.stock,
                sellPrice: parseFloat(product.sellPrice),
                buyPrice: parseFloat(product.buyPrice),
                category: product.category,
                sections: product.sections,
                published: product.published,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// 5. LISTAR COMBOS (FILTRADO POR TIENDA)
server.tool(
  "list_combos",
  "Lista los combos configurados exclusivamente para la tienda activa (por defecto Nova Insumos).",
  {
    activeOnly: z.boolean().optional().default(false).describe("Si es true, solo devuelve combos activos y publicados"),
    storeSlug: z.string().optional().default("nova-insumos").describe("Slug de la tienda a consultar. Por defecto 'nova-insumos'"),
  },
  async ({ activeOnly = false, storeSlug = "nova-insumos" }) => {
    await ensureDB();
    const context = await resolveStoreContext(storeSlug);
    const storeFilter = getStoreFilter(context);

    const conditions = [storeFilter];
    if (activeOnly) {
      conditions.push({ isActive: true, published: true });
    }

    const combos = await Combo.find({ $and: conditions }).sort({ createdAt: -1 }).lean();

    const formatted = combos.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      description: c.description || "",
      comboPrice: c.comboPrice,
      totalNormalPrice: c.totalNormalPrice,
      savings: c.savings,
      savingsPercentage:
        c.totalNormalPrice > 0 ? (((c.savings) / c.totalNormalPrice) * 100).toFixed(1) + "%" : "0%",
      itemsCount: c.items?.length || 0,
      items: c.items?.map((it) => ({
        productName: it.productName,
        quantity: it.quantity,
        unitSellPrice: it.unitSellPrice,
      })),
      published: c.published,
      isActive: c.isActive,
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              tienda: context.storeName,
              totalCombos: formatted.length,
              combos: formatted,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// 6. CREAR UN COMBO
server.tool(
  "create_combo",
  "Crea un combo en Nova Insumos agrupando productos existentes, calculando automáticamente el precio normal total y el ahorro para el cliente.",
  {
    name: z.string().describe("Nombre atractivo del combo (ej: Kit Reparación Total)"),
    comboPrice: z.number().describe("Precio final promocional del combo en ARS"),
    items: z
      .array(
        z.object({
          productId: z.string().describe("ID de MongoDB del producto"),
          quantity: z.number().min(1).describe("Cantidad incluida en el combo"),
        })
      )
      .describe("Lista de productos y cantidades que componen el combo"),
    description: z.string().optional().describe("Descripción de los beneficios del combo"),
    published: z.boolean().optional().default(true).describe("Publicar en la tienda"),
    storeSlug: z.string().optional().default("nova-insumos").describe("Slug de la tienda destino. Por defecto 'nova-insumos'"),
  },
  async ({ name, comboPrice, items, description = "", published = true, storeSlug = "nova-insumos" }) => {
    await ensureDB();
    const context = await resolveStoreContext(storeSlug);

    if (!items || items.length === 0) {
      return { content: [{ type: "text", text: "Error: El combo debe tener al menos un producto." }] };
    }

    const populatedItems = [];
    let totalNormalPrice = 0;

    for (const item of items) {
      const prod = await Product.findById(item.productId);
      if (!prod) {
        return {
          content: [{ type: "text", text: `Error: No se encontró el producto con ID ${item.productId}.` }],
        };
      }
      const unitPrice = parseFloat(prod.sellPrice || "0");
      populatedItems.push({
        product: prod._id,
        productName: prod.name,
        quantity: item.quantity,
        unitSellPrice: unitPrice,
      });
      totalNormalPrice += unitPrice * item.quantity;
    }

    const savings = Math.max(0, totalNormalPrice - comboPrice);

    const newCombo = await Combo.create({
      name,
      description,
      items: populatedItems,
      totalNormalPrice,
      comboPrice,
      savings,
      published,
      isActive: true,
      user: context.userId,
      store: context.storeId,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              mensaje: "Combo creado exitosamente",
              combo: {
                id: newCombo._id.toString(),
                name: newCombo.name,
                comboPrice: newCombo.comboPrice,
                totalNormalPrice: newCombo.totalNormalPrice,
                savings: newCombo.savings,
                items: newCombo.items,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// 7. EDITAR UN COMBO
server.tool(
  "update_combo",
  "Modifica un combo existente (precio promocional, nombre, descripción, estado activo o productos componentes).",
  {
    comboId: z.string().describe("ID del combo a editar"),
    name: z.string().optional(),
    comboPrice: z.number().optional(),
    description: z.string().optional(),
    published: z.boolean().optional(),
    isActive: z.boolean().optional(),
    items: z
      .array(
        z.object({
          productId: z.string(),
          quantity: z.number().min(1),
        })
      )
      .optional()
      .describe("Opcional: Reemplazar los productos componentes del combo"),
  },
  async ({ comboId, ...updates }) => {
    await ensureDB();

    const combo = await Combo.findById(comboId);
    if (!combo) {
      return { content: [{ type: "text", text: `Error: Combo no encontrado con ID ${comboId}.` }] };
    }

    if (updates.name !== undefined) combo.name = updates.name;
    if (updates.description !== undefined) combo.description = updates.description;
    if (updates.published !== undefined) combo.published = updates.published;
    if (updates.isActive !== undefined) combo.isActive = updates.isActive;

    if (updates.items !== undefined) {
      const populatedItems = [];
      let totalNormalPrice = 0;

      for (const item of updates.items) {
        const prod = await Product.findById(item.productId);
        if (!prod) {
          return { content: [{ type: "text", text: `Error: Producto no encontrado con ID ${item.productId}.` }] };
        }
        const unitPrice = parseFloat(prod.sellPrice || "0");
        populatedItems.push({
          product: prod._id,
          productName: prod.name,
          quantity: item.quantity,
          unitSellPrice: unitPrice,
        });
        totalNormalPrice += unitPrice * item.quantity;
      }

      combo.items = populatedItems;
      combo.totalNormalPrice = totalNormalPrice;
    }

    if (updates.comboPrice !== undefined) {
      combo.comboPrice = updates.comboPrice;
    }

    combo.savings = Math.max(0, combo.totalNormalPrice - combo.comboPrice);
    await combo.save();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              mensaje: "Combo actualizado correctamente",
              combo: {
                id: combo._id.toString(),
                name: combo.name,
                comboPrice: combo.comboPrice,
                totalNormalPrice: combo.totalNormalPrice,
                savings: combo.savings,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// 8. ANÁLISIS INTEGRAL DE INVENTARIO (FILTRADO POR TIENDA)
server.tool(
  "analyze_inventory",
  "Genera un reporte ejecutivo completo exclusivamente para la tienda activa (Nova Insumos): valorización a costo, valorización a venta, margen promedio, alertas de stock y métricas comerciales.",
  {
    storeSlug: z.string().optional().default("nova-insumos").describe("Slug de la tienda a analizar. Por defecto 'nova-insumos'"),
  },
  async ({ storeSlug = "nova-insumos" } = {}) => {
    await ensureDB();
    const context = await resolveStoreContext(storeSlug);
    const storeFilter = getStoreFilter(context);

    const [products, combos] = await Promise.all([
      Product.find(storeFilter).lean(),
      Combo.find(storeFilter).lean(),
    ]);

    let totalValuationCost = 0;
    let totalValuationSell = 0;
    let totalStockUnits = 0;
    const outOfStockList = [];
    const lowStockList = [];
    const categoryCount = {};
    const brandCount = {};

    products.forEach((p) => {
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

      const brand = p.brand || "Sin marca";
      brandCount[brand] = (brandCount[brand] || 0) + 1;
    });

    const potentialGrossProfit = totalValuationSell - totalValuationCost;
    const overallMargin =
      totalValuationCost > 0
        ? ((potentialGrossProfit / totalValuationCost) * 100).toFixed(1) + "%"
        : "0%";

    const topViewed = [...products]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
      .map((p) => ({
        name: p.name,
        views: p.views || 0,
        stock: p.stock,
        sellPrice: parseFloat(p.sellPrice),
      }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              tienda: context.storeName,
              slug: storeSlug,
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
                quiebresDeStock: {
                  cantidad: outOfStockList.length,
                  productos: outOfStockList,
                },
                bajoStockAlerta: {
                  cantidad: lowStockList.length,
                  productos: lowStockList,
                },
              },
              top5MasVistos: topViewed,
              distribucionPorCategoria: categoryCount,
              distribucionPorMarca: brandCount,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// ─── INICIO DEL TRANSPORTE STDIO ─────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 Servidor MCP de Inventario conectado en modo STDIO.");
}

main().catch((err) => {
  console.error("Error fatal en el servidor MCP:", err);
  process.exit(1);
});
