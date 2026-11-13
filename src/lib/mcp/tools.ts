import mongoose from "mongoose";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Store from "@/models/Store";
import SaleProduct from "@/models/SaleProduct";
import Campaign from "@/models/Campaign";
import ContentPiece from "@/models/ContentPiece";
import GlobalDiscount from "@/models/GlobalDiscount";
import { getMcpProfile, getMcpUserId } from "./auth";
import { escapeRegex } from "./oauth";
import connectDB from "@/config/db";
import cloudinary from "@/config/cloudinary";
import { generateArgentineBarcode } from "@/lib/barcodeUtils";
import slugify from "slugify";

/**
 * Tools MCP de SOLO LECTURA.
 *
 * Regla de oro de este archivo: ningún input acepta `userId`, `email` ni un
 * `storeId` arbitrario. El dueño de los datos sale de `ctx.http.authInfo`
 * (el bearer token verificado en el route handler), y todas las queries
 * filtran por ese id. Si una tool recibe un ID de producto ajeno, el filtro
 * `{ _id, user }` devuelve null y se responde "no encontrado".
 *
 * Tampoco se exponen `buyPrice` ni `wholesalePrice`, ni datos de leads.
 */

class ToolInputError extends Error {}

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
} as const;

const storeParam = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .optional()
  .describe("Slug o ID de una tienda del usuario autenticado. Si se omite, se usan todas sus tiendas.");

const daysParam = z
  .number()
  .int()
  .min(1)
  .max(365)
  .optional()
  .describe("Ventana de tiempo hacia atrás, en días. Por defecto 30.");

const limitParam = (max: number, fallback: number) =>
  z
    .number()
    .int()
    .min(1)
    .max(max)
    .optional()
    .describe(`Cantidad máxima de resultados. Por defecto ${fallback}, máximo ${max}.`);

function round2(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function iso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function textResult(data: Record<string, unknown>) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
    structuredContent: data,
  };
}

function errorResult(message: string) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

async function run(label: string, fn: () => Promise<Record<string, unknown>>) {
  try {
    return textResult(await fn());
  } catch (error) {
    if (error instanceof ToolInputError) return errorResult(error.message);
    console.error(`[mcp] ${label}:`, error);
    return errorResult(
      "No se pudieron consultar tus datos en este momento. Intentá de nuevo."
    );
  }
}

async function resolveStore(userId: string, ref?: string) {
  if (!ref) return null;

  const conditions: Record<string, unknown>[] = [{ slug: ref }];
  if (mongoose.isValidObjectId(ref)) conditions.push({ _id: ref });

  const store = await Store.findOne({
    user: userId,
    $or: conditions,
  }).select("_id slug name storeName");

  if (!store) {
    throw new ToolInputError(
      `No encontré la tienda "${ref}" en tu cuenta. Usá list_stores para ver tus tiendas.`
    );
  }

  return store;
}

async function getActiveDiscounts(userId: string, storeId?: string) {
  const now = new Date();
  const query: Record<string, unknown> = {
    user: userId,
    isActive: true,
    $and: [
      {
        $or: [
          { startDate: { $lte: now } },
          { startDate: { $exists: false } },
          { startDate: null },
        ],
      },
      {
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gte: now } },
        ],
      },
    ],
  };

  if (storeId) query.store = storeId;

  return GlobalDiscount.find(query);
}

function discountMap(discounts: any[]): Map<string, any> {
  return new Map(discounts.map((discount) => [String(discount.store), discount]));
}

/**
 * Normaliza un producto para el modelo.
 * OJO: acá se dejan afuera buyPrice y wholesalePrice a propósito.
 */
function serializeProduct(product: any, discount?: any) {
  const basePrice = toNumber(product.sellPrice);
  let percentage = 0;
  let effectivePrice = basePrice;
  let isGlobalDiscount = false;

  if (product.hasDiscount && toNumber(product.discountPercentage) > 0) {
    percentage = toNumber(product.discountPercentage);
    effectivePrice = product.discountedPrice
      ? toNumber(product.discountedPrice)
      : basePrice * (1 - percentage / 100);
  } else if (discount) {
    const excludedProducts = (discount.excludedProducts || []).map(String);
    const excludedCategories = (discount.excludedCategories || []).map(String);
    const excluded =
      excludedProducts.includes(String(product._id)) ||
      excludedCategories.includes(String(product.category));

    if (!excluded) {
      percentage = toNumber(discount.discountPercentage);
      effectivePrice = basePrice * (1 - percentage / 100);
      isGlobalDiscount = true;
    }
  }

  return {
    id: String(product._id),
    name: product.name || "",
    brand: product.brand || "",
    description: truncate(product.description || "", 2000),
    category: product.category || "",
    store: String(product.store || ""),
    image: product.image || "",
    images: Array.isArray(product.images) ? product.images : [],
    attributes: product.attributes || {},
    sections: Array.isArray(product.sections)
      ? product.sections.map((section: any) => ({
          title: section.title || "",
          content: truncate(section.content || "", 2000),
        }))
      : [],
    sellPrice: round2(basePrice),
    effectivePrice: round2(effectivePrice),
    hasDiscount: percentage > 0,
    discountPercentage: percentage,
    isGlobalDiscount,
    stock: toNumber(product.stock),
    published: Boolean(product.published),
    code: product.code || "",
    barcode: product.barcode || "",
    views: toNumber(product.views),
    createdAt: iso(product.createdAt),
    updatedAt: iso(product.updatedAt),
  };
}

export function registerTools(server: McpServer) {
  server.registerTool(
    "get_profile",
    {
      title: "Perfil de la cuenta",
      description:
        "Devuelve la identidad de la cuenta autenticada en Makeup Register. No recibe parámetros y nunca devuelve datos de otra cuenta.",
      inputSchema: z.object({}),
      outputSchema: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        nickname: z.string(),
      }),
      annotations: READ_ONLY,
      _meta: { "openai/profile": true },
    },
    async (_args, ctx) => {
      const profile = getMcpProfile(ctx);
      const data = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        nickname: "Makeup Register",
      };
      return textResult(data);
    }
  );

  server.registerTool(
    "list_stores",
    {
      title: "Listar tiendas",
      description:
        "Lista las tiendas del usuario autenticado. No devuelve configuración de pagos ni credenciales.",
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async (_args, ctx) =>
      run("list_stores", async () => {
        const userId = getMcpUserId(ctx);
        const stores = await Store.find({ user: userId })
          .select(
            "name storeName description slug customUrl isActive isPublic createdAt updatedAt"
          )
          .sort({ createdAt: 1 });

        return {
          total: stores.length,
          stores: stores.map((store: any) => ({
            id: String(store._id),
            name: store.name || "",
            storeName: store.storeName || "",
            description: store.description || "",
            slug: store.slug || "",
            customUrl: store.customUrl || "",
            isActive: Boolean(store.isActive),
            isPublic: Boolean(store.isPublic),
            createdAt: iso(store.createdAt),
            updatedAt: iso(store.updatedAt),
          })),
        };
      })
  );

  server.registerTool(
    "list_products",
    {
      title: "Listar productos",
      description:
        "Lista y busca productos del usuario autenticado. Devuelve precio de venta y precio efectivo con descuento, pero nunca precio de compra ni mayorista. effectivePrice es el precio final que ve el cliente.",
      inputSchema: z.object({
        search: z
          .string()
          .trim()
          .min(1)
          .max(100)
          .optional()
          .describe("Texto a buscar en nombre, marca, descripción, categoría o preocupaciones."),
        category: z
          .string()
          .trim()
          .min(1)
          .max(100)
          .optional()
          .describe("Nombre exacto de la categoría."),
        brand: z
          .string()
          .trim()
          .min(1)
          .max(100)
          .optional()
          .describe("Marca exacta (sin distinguir mayúsculas)."),
        preocupacion: z
          .string()
          .trim()
          .min(1)
          .max(100)
          .optional()
          .describe("Filtrar por preocupación capilar o cosmética (ej: 'hidratación', 'anti-edad'). Acepta tildes o sin tildes."),
        attributeKey: z
          .string()
          .trim()
          .min(1)
          .max(60)
          .optional()
          .describe("Nombre del atributo dinámico a filtrar (ej: 'color', 'aroma', 'tipo_cabello'). Usar junto con attributeValue."),
        attributeValue: z
          .string()
          .trim()
          .min(1)
          .max(100)
          .optional()
          .describe("Valor del atributo dinámico (ej: 'rojo', 'menta'). Usar junto con attributeKey."),
        published: z
          .enum(["all", "true", "false"])
          .optional()
          .describe("Filtrar por productos publicados u ocultos. Por defecto all."),
        stock: z
          .enum(["all", "in-stock", "low-stock", "out-of-stock"])
          .optional()
          .describe("Filtrar por estado de stock. Por defecto all."),
        minPrice: z.number().nonnegative().optional().describe("Precio de venta mínimo."),
        maxPrice: z.number().nonnegative().optional().describe("Precio de venta máximo."),
        store: storeParam,
        page: z.number().int().min(1).optional().describe("Página, desde 1."),
        limit: limitParam(50, 20),
      }),
      annotations: READ_ONLY,
    },
    async (args, ctx) =>
      run("list_products", async () => {
        const userId = getMcpUserId(ctx);
        const store = await resolveStore(userId, args.store);

        if (
          args.minPrice !== undefined &&
          args.maxPrice !== undefined &&
          args.minPrice > args.maxPrice
        ) {
          throw new ToolInputError("minPrice no puede ser mayor que maxPrice.");
        }

        const query: Record<string, any> = { user: userId };
        if (store) query.store = String(store._id);

        if (args.search) {
          const regex = new RegExp(escapeRegex(args.search), "i");
          query.$or = [
            { name: regex },
            { description: regex },
            { category: regex },
            { brand: regex },
            { "attributes.preocupacion": regex },
          ];
        }

        if (args.category) query.category = args.category;
        if (args.brand) {
          query.brand = new RegExp(`^${escapeRegex(args.brand)}$`, "i");
        }

        // Filtro por preocupación (con tolerancia a tildes)
        if (args.preocupacion) {
          const normalized = args.preocupacion
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
          query["attributes.preocupacion"] = {
            $elemMatch: {
              $regex: new RegExp(escapeRegex(normalized), "i"),
            },
          };
        }

        // Filtro por atributo dinámico genérico
        if (args.attributeKey && args.attributeValue) {
          const safeKey = args.attributeKey.replace(/[^a-zA-Z0-9_\-]/g, "");
          query[`attributes.${safeKey}`] = {
            $elemMatch: {
              $regex: new RegExp(escapeRegex(args.attributeValue), "i"),
            },
          };
        }

        if (args.published === "true") query.published = true;
        if (args.published === "false") query.published = false;

        if (args.stock === "in-stock") query.stock = { $gt: 0 };
        if (args.stock === "low-stock") query.stock = { $gt: 0, $lte: 5 };
        if (args.stock === "out-of-stock") query.stock = 0;

        const priceFilters: Record<string, unknown>[] = [];
        if (args.minPrice !== undefined) {
          priceFilters.push({
            $expr: { $gte: [{ $toDouble: "$sellPrice" }, args.minPrice] },
          });
        }
        if (args.maxPrice !== undefined) {
          priceFilters.push({
            $expr: { $lte: [{ $toDouble: "$sellPrice" }, args.maxPrice] },
          });
        }
        if (priceFilters.length) {
          query.$and = [...(query.$and || []), ...priceFilters];
        }

        const limit = args.limit ?? 20;
        const page = args.page ?? 1;
        const skip = (page - 1) * limit;

        const [total, products] = await Promise.all([
          Product.countDocuments(query),
          Product.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        ]);

        const discounts = await getActiveDiscounts(
          userId,
          store ? String(store._id) : undefined
        );
        const byStore = discountMap(discounts);

        return {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          products: products.map((product: any) =>
            serializeProduct(product, byStore.get(String(product.store)))
          ),
        };
      })
  );

  server.registerTool(
    "get_product",
    {
      title: "Ver un producto",
      description:
        "Devuelve el detalle de un producto del usuario autenticado por ID, código interno o código de barras. Un producto de otra cuenta responde 'no encontrado'.",
      inputSchema: z
        .object({
          id: z.string().trim().min(1).optional().describe("ID de Mongo del producto."),
          code: z.string().trim().min(1).max(100).optional().describe("Código interno del producto."),
          barcode: z
            .string()
            .trim()
            .min(1)
            .max(100)
            .optional()
            .describe("Código de barras del producto."),
        })
        .describe("Pasá al menos uno de los tres identificadores."),
      annotations: READ_ONLY,
    },
    async (args, ctx) =>
      run("get_product", async () => {
        const userId = getMcpUserId(ctx);
        const conditions: Record<string, unknown>[] = [];

        if (args.id) {
          if (!mongoose.isValidObjectId(args.id)) {
            throw new ToolInputError("El ID del producto no es válido.");
          }
          conditions.push({ _id: args.id });
        }
        if (args.code) conditions.push({ code: args.code });
        if (args.barcode) conditions.push({ barcode: args.barcode });

        if (!conditions.length) {
          throw new ToolInputError("Pasá id, code o barcode para buscar el producto.");
        }

        const product = await Product.findOne({
          user: userId,
          $or: conditions,
        });

        if (!product) {
          throw new ToolInputError(
            "No encontré ese producto en tu cuenta. Verificá el identificador."
          );
        }

        const store = await Store.findOne({
          _id: product.store,
          user: userId,
        }).select("name storeName slug");

        const discounts = await getActiveDiscounts(userId, String(product.store));
        const serialized = serializeProduct(product, discounts[0]);

        return {
          product: {
            ...serialized,
            storeName: store?.storeName || store?.name || "",
            storeSlug: store?.slug || "",
          },
        };
      })
  );

  server.registerTool(
    "list_low_stock",
    {
      title: "Productos con stock bajo",
      description:
        "Lista productos del usuario autenticado con stock igual o menor al umbral indicado. Sirve para reposición.",
      inputSchema: z.object({
        threshold: z
          .number()
          .int()
          .min(0)
          .max(50)
          .optional()
          .describe("Umbral de stock. Por defecto 5."),
        includeOutOfStock: z
          .boolean()
          .optional()
          .describe("Incluir productos con stock 0. Por defecto true."),
        store: storeParam,
        limit: limitParam(100, 30),
      }),
      annotations: READ_ONLY,
    },
    async (args, ctx) =>
      run("list_low_stock", async () => {
        const userId = getMcpUserId(ctx);
        const store = await resolveStore(userId, args.store);
        const threshold = args.threshold ?? 5;
        const includeOutOfStock = args.includeOutOfStock ?? true;

        const query: Record<string, any> = {
          user: userId,
          stock: includeOutOfStock
            ? { $lte: threshold }
            : { $gt: 0, $lte: threshold },
        };
        if (store) query.store = String(store._id);

        const products = await Product.find(query)
          .sort({ stock: 1, name: 1 })
          .limit(args.limit ?? 30);

        const discounts = await getActiveDiscounts(
          userId,
          store ? String(store._id) : undefined
        );
        const byStore = discountMap(discounts);

        return {
          threshold,
          includeOutOfStock,
          total: products.length,
          products: products.map((product: any) =>
            serializeProduct(product, byStore.get(String(product.store)))
          ),
        };
      })
  );

  server.registerTool(
    "list_categories",
    {
      title: "Listar categorías",
      description:
        "Lista las categorías del usuario autenticado, con su cantidad de productos y estado.",
      inputSchema: z.object({
        store: storeParam,
        includeInactive: z
          .boolean()
          .optional()
          .describe("Incluir categorías inactivas. Por defecto false."),
      }),
      annotations: READ_ONLY,
    },
    async (args, ctx) =>
      run("list_categories", async () => {
        const userId = getMcpUserId(ctx);
        const store = await resolveStore(userId, args.store);

        const query: Record<string, any> = { user: userId };
        if (store) query.store = String(store._id);
        if (!args.includeInactive) query.isActive = true;

        const categories = await Category.find(query)
          .select(
            "name slug description color icon isActive productCount orden store"
          )
          .sort({ orden: 1, name: 1 });

        return {
          total: categories.length,
          categories: categories.map((category: any) => ({
            id: String(category._id),
            name: category.name || "",
            slug: category.slug || "",
            description: category.description || "",
            color: category.color || "",
            icon: category.icon || "",
            isActive: Boolean(category.isActive),
            productCount: toNumber(category.productCount),
            order: toNumber(category.orden),
            store: String(category.store || ""),
          })),
        };
      })
  );

  server.registerTool(
    "sales_summary",
    {
      title: "Resumen de ventas",
      description:
        "Devuelve ingresos, unidades vendidas, cantidad de ventas y los productos más vendidos en los últimos N días. Solo datos de la cuenta autenticada.",
      inputSchema: z.object({
        days: daysParam,
        limit: limitParam(20, 5),
      }),
      annotations: READ_ONLY,
    },
    async (args, ctx) =>
      run("sales_summary", async () => {
        const userId = getMcpUserId(ctx);
        const days = args.days ?? 30;
        const from = new Date(Date.now() - days * 86400000);
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const revenue = {
          $sum: {
            $multiply: [
              {
                $convert: {
                  input: "$sellPrice",
                  to: "double",
                  onError: 0,
                  onNull: 0,
                },
              },
              "$stock",
            ],
          },
        };

        const [totals, top] = await Promise.all([
          SaleProduct.aggregate([
            { $match: { user: userObjectId, createdAt: { $gte: from } } },
            {
              $group: {
                _id: null,
                revenue,
                units: { $sum: "$stock" },
                sales: { $sum: 1 },
              },
            },
          ]),
          SaleProduct.aggregate([
            { $match: { user: userObjectId, createdAt: { $gte: from } } },
            {
              $group: {
                _id: "$idProduct",
                units: { $sum: "$stock" },
                revenue,
              },
            },
            { $sort: { revenue: -1, units: -1 } },
            { $limit: args.limit ?? 5 },
          ]),
        ]);

        const productIds = top
          .map((row) => row._id)
          .filter((id) => mongoose.isValidObjectId(id));
        const products = productIds.length
          ? await Product.find({ user: userId, _id: { $in: productIds } }).select(
              "name"
            )
          : [];
        const nameById = new Map(
          products.map((product: any) => [String(product._id), product.name])
        );

        const summary = totals[0] || { revenue: 0, units: 0, sales: 0 };

        return {
          days,
          from: from.toISOString(),
          totals: {
            revenue: round2(toNumber(summary.revenue)),
            units: toNumber(summary.units),
            sales: toNumber(summary.sales),
            averageTicket:
              summary.sales > 0
                ? round2(toNumber(summary.revenue) / summary.sales)
                : 0,
          },
          topProducts: top.map((row) => ({
            productId: String(row._id),
            name: nameById.get(String(row._id)) || "Producto no disponible",
            units: toNumber(row.units),
            revenue: round2(toNumber(row.revenue)),
          })),
        };
      })
  );

  server.registerTool(
    "list_sales",
    {
      title: "Listar ventas",
      description:
        "Lista las ventas recientes de la cuenta autenticada. No incluye datos personales de clientes.",
      inputSchema: z.object({
        days: daysParam,
        limit: limitParam(50, 20),
      }),
      annotations: READ_ONLY,
    },
    async (args, ctx) =>
      run("list_sales", async () => {
        const userId = getMcpUserId(ctx);
        const days = args.days ?? 30;
        const from = new Date(Date.now() - days * 86400000);

        const sales = await SaleProduct.find({
          user: userId,
          createdAt: { $gte: from },
        })
          .sort({ createdAt: -1 })
          .limit(args.limit ?? 20)
          .lean();

        const productIds = sales
          .map((sale: any) => sale.idProduct)
          .filter((id) => mongoose.isValidObjectId(id));
        const products = productIds.length
          ? await Product.find({ user: userId, _id: { $in: productIds } }).select(
              "name"
            )
          : [];
        const nameById = new Map(
          products.map((product: any) => [String(product._id), product.name])
        );

        return {
          days,
          from: from.toISOString(),
          total: sales.length,
          sales: sales.map((sale: any) => {
            const unitPrice = toNumber(sale.sellPrice);
            const quantity = toNumber(sale.stock);
            return {
              id: String(sale._id),
              productId: String(sale.idProduct || ""),
              productName:
                nameById.get(String(sale.idProduct)) || "Producto no disponible",
              quantity,
              unitPrice: round2(unitPrice),
              total: round2(unitPrice * quantity),
              isPublicSale: Boolean(sale.isPublicSale),
              createdAt: iso(sale.createdAt),
            };
          }),
        };
      })
  );

  server.registerTool(
    "dashboard_summary",
    {
      title: "Resumen del negocio",
      description:
        "Resumen general del catálogo, inventario y ventas de la cuenta autenticada. No devuelve costos, ganancias ni márgenes.",
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async (_args, ctx) =>
      run("dashboard_summary", async () => {
        const userId = getMcpUserId(ctx);

        const [products, sales] = await Promise.all([
          Product.find({ user: userId })
            .select("sellPrice stock published views")
            .lean(),
          SaleProduct.find({ user: userId }).select("sellPrice stock").lean(),
        ]);

        let totalStock = 0;
        let inventoryRetailValue = 0;
        let published = 0;
        let outOfStock = 0;
        let lowStock = 0;
        let totalViews = 0;

        for (const product of products as any[]) {
          const stock = toNumber(product.stock);
          totalStock += stock;
          inventoryRetailValue += toNumber(product.sellPrice) * stock;
          totalViews += toNumber(product.views);
          if (product.published) published += 1;
          if (stock === 0) outOfStock += 1;
          else if (stock <= 5) lowStock += 1;
        }

        let revenue = 0;
        let units = 0;
        for (const sale of sales as any[]) {
          const quantity = toNumber(sale.stock);
          revenue += toNumber(sale.sellPrice) * quantity;
          units += quantity;
        }

        return {
          catalog: {
            totalProducts: products.length,
            published,
            hidden: products.length - published,
            totalViews,
          },
          inventory: {
            totalStock,
            outOfStock,
            lowStock,
            retailValue: round2(inventoryRetailValue),
          },
          sales: {
            revenue: round2(revenue),
            units,
            count: sales.length,
            averageTicket:
              sales.length > 0 ? round2(revenue / sales.length) : 0,
          },
          generatedAt: new Date().toISOString(),
        };
      })
  );

  server.registerTool(
    "list_campaigns",
    {
      title: "Listar campañas de marketing",
      description:
        "Lista las campañas de marketing de la cuenta autenticada, con su canal, estado y UTM.",
      inputSchema: z.object({
        status: z
          .enum(["activa", "pausada", "terminada"])
          .optional()
          .describe("Filtrar por estado de la campaña."),
        store: storeParam,
        limit: limitParam(100, 30),
      }),
      annotations: READ_ONLY,
    },
    async (args, ctx) =>
      run("list_campaigns", async () => {
        const userId = getMcpUserId(ctx);
        const store = await resolveStore(userId, args.store);

        const query: Record<string, any> = { user: userId };
        if (store) query.store = String(store._id);
        if (args.status) query.status = args.status;

        const campaigns = await Campaign.find(query)
          .select("name channel utmMedium status notes store createdAt updatedAt")
          .sort({ createdAt: -1 })
          .limit(args.limit ?? 30);

        return {
          total: campaigns.length,
          campaigns: campaigns.map((campaign: any) => ({
            id: String(campaign._id),
            name: campaign.name || "",
            channel: campaign.channel || "",
            utmMedium: campaign.utmMedium || "",
            status: campaign.status || "",
            notes: truncate(campaign.notes || "", 1000),
            store: String(campaign.store || ""),
            createdAt: iso(campaign.createdAt),
            updatedAt: iso(campaign.updatedAt),
          })),
        };
      })
  );

  server.registerTool(
    "list_content_pieces",
    {
      title: "Listar piezas de contenido",
      description:
        "Lista las piezas de planificación de contenido (Facebook y WhatsApp) de la cuenta autenticada, con estado y métricas cargadas a mano.",
      inputSchema: z.object({
        status: z
          .enum(["idea", "listo", "programado", "publicado", "descartado"])
          .optional()
          .describe("Filtrar por estado de la pieza."),
        network: z
          .enum(["facebook", "whatsapp"])
          .optional()
          .describe("Filtrar por red social."),
        store: storeParam,
        limit: limitParam(100, 30),
      }),
      annotations: READ_ONLY,
    },
    async (args, ctx) =>
      run("list_content_pieces", async () => {
        const userId = getMcpUserId(ctx);
        const store = await resolveStore(userId, args.store);

        const query: Record<string, any> = { user: userId };
        if (store) query.store = String(store._id);
        if (args.status) query.status = args.status;
        if (args.network) query.network = args.network;

        const pieces = await ContentPiece.find(query)
          .select(
            "title copy notes network format status scheduledFor publishedAt product promotion campaign results store createdAt updatedAt"
          )
          .sort({ scheduledFor: -1, createdAt: -1 })
          .limit(args.limit ?? 30);

        return {
          total: pieces.length,
          pieces: pieces.map((piece: any) => ({
            id: String(piece._id),
            title: piece.title || "",
            copy: truncate(piece.copy || "", 3000),
            notes: truncate(piece.notes || "", 1000),
            network: piece.network || "",
            format: piece.format || "",
            status: piece.status || "",
            scheduledFor: iso(piece.scheduledFor),
            publishedAt: iso(piece.publishedAt),
            product: piece.product ? String(piece.product) : null,
            promotion: piece.promotion ? String(piece.promotion) : null,
            campaign: piece.campaign ? String(piece.campaign) : null,
            results: {
              reach: toNumber(piece.results?.reach),
              interactions: toNumber(piece.results?.interactions),
            },
            store: String(piece.store || ""),
            createdAt: iso(piece.createdAt),
            updatedAt: iso(piece.updatedAt),
          })),
        };
      })
  );

  // ─────────────────────────────────────────────────────────────────────────
  // list_attributes — atributos dinámicos del catálogo (menú dinámico)
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "list_attributes",
    {
      title: "Listar atributos del catálogo",
      description:
        "Devuelve todos los atributos dinámicos (preocupaciones, colores, aromas, tipos de cabello, etc.) " +
        "que tienen los productos publicados de la tienda. Sirve para armar menús de navegación dinámicos " +
        "y para saber qué valores puede tener cada atributo antes de filtrar con list_products.",
      inputSchema: z.object({
        store: storeParam,
        onlyPublished: z
          .boolean()
          .optional()
          .describe("Incluir solo productos publicados. Por defecto true."),
      }),
      annotations: READ_ONLY,
    },
    async (args, ctx) =>
      run("list_attributes", async () => {
        await connectDB();
        const userId = getMcpUserId(ctx);
        const store = await resolveStore(userId, args.store);

        const query: Record<string, any> = { user: userId };
        if (store) query.store = String(store._id);
        if (args.onlyPublished !== false) query.published = true;

        const products = await Product.find(query)
          .select("attributes brand")
          .lean();

        const attributeMap: Record<string, Set<string>> = {};
        const brands = new Set<string>();

        for (const product of products as any[]) {
          if (product.brand) brands.add(product.brand.trim());
          const attrs = product.attributes || {};
          for (const [key, value] of Object.entries(attrs)) {
            if (!attributeMap[key]) attributeMap[key] = new Set();
            const values = Array.isArray(value) ? value : [value];
            for (const v of values) {
              if (!v) continue;
              if (typeof v === "string") {
                try {
                  const parsed = JSON.parse(v);
                  if (parsed && typeof parsed === "object") {
                    const label = parsed.name || parsed.hex || v;
                    if (label) attributeMap[key].add(label);
                    continue;
                  }
                } catch { /* string plano */ }
                attributeMap[key].add(v.trim());
              }
            }
          }
        }

        const result: Record<string, string[]> = {};
        for (const [key, values] of Object.entries(attributeMap)) {
          result[key] = [...values].sort((a, b) => a.localeCompare(b, "es"));
        }

        return {
          totalProducts: (products as any[]).length,
          brands: [...brands].sort((a, b) => a.localeCompare(b, "es")),
          attributes: result,
          attributeKeys: Object.keys(result).sort(),
        };
      })
  );

  // ─────────────────────────────────────────────────────────────────────────
  // get_menu_data — datos completos para menú dinámico público
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "get_menu_data",
    {
      title: "Datos del menú dinámico",
      description:
        "Devuelve en una sola consulta todo lo necesario para armar el menú de navegación dinámico: " +
        "categorías activas, marcas y todos los atributos (preocupaciones, colores, aromas, etc.). " +
        "Equivale a llamar list_categories + list_attributes en un solo paso.",
      inputSchema: z.object({
        store: storeParam,
      }),
      annotations: READ_ONLY,
    },
    async (args, ctx) =>
      run("get_menu_data", async () => {
        await connectDB();
        const userId = getMcpUserId(ctx);
        const store = await resolveStore(userId, args.store);

        const productQuery: Record<string, any> = { user: userId, published: true };
        const categoryQuery: Record<string, any> = { user: userId, isActive: true };
        if (store) {
          productQuery.store = String(store._id);
          categoryQuery.store = String(store._id);
        }

        const [products, categories] = await Promise.all([
          Product.find(productQuery).select("attributes brand").lean(),
          Category.find(categoryQuery)
            .select("name slug description color icon productCount orden")
            .sort({ orden: 1, name: 1 })
            .lean(),
        ]);

        const attributeMap: Record<string, Set<string>> = {};
        const brands = new Set<string>();

        for (const product of products as any[]) {
          if ((product as any).brand) brands.add((product as any).brand.trim());
          const attrs = (product as any).attributes || {};
          for (const [key, value] of Object.entries(attrs)) {
            if (!attributeMap[key]) attributeMap[key] = new Set();
            const values = Array.isArray(value) ? value : [value];
            for (const v of values) {
              if (!v) continue;
              if (typeof v === "string") {
                try {
                  const parsed = JSON.parse(v);
                  if (parsed && typeof parsed === "object") {
                    const label = parsed.name || parsed.hex || v;
                    if (label) attributeMap[key].add(label);
                    continue;
                  }
                } catch { /* string plano */ }
                attributeMap[key].add(v.trim());
              }
            }
          }
        }

        const attributes: Record<string, string[]> = {};
        for (const [key, values] of Object.entries(attributeMap)) {
          attributes[key] = [...values].sort((a, b) => a.localeCompare(b, "es"));
        }

        return {
          categories: (categories as any[]).map((cat: any) => ({
            id: String(cat._id),
            name: cat.name || "",
            slug: cat.slug || "",
            description: cat.description || "",
            color: cat.color || "",
            icon: cat.icon || "",
            productCount: toNumber(cat.productCount),
            order: toNumber(cat.orden),
          })),
          brands: [...brands].sort((a, b) => a.localeCompare(b, "es")),
          attributes,
          attributeKeys: Object.keys(attributes).sort(),
          totalPublishedProducts: (products as any[]).length,
        };
      })
  );

  // ─────────────────────────────────────────────────────────────────────────
  // set_product_attributes — ESCRITURA: edita los atributos de un producto
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "set_product_attributes",
    {
      title: "Editar atributos de un producto",
      description:
        "Actualiza los atributos dinámicos (preocupaciones, colores, aromas, etc.) de un producto " +
        "propio. Solo puede modificar atributos; no cambia precio, stock, nombre ni imágenes. " +
        "Pasá los atributos completos que querés guardar: los que no mandes se eliminarán. " +
        "Solo funciona con productos de la cuenta autenticada.",
      inputSchema: z.object({
        id: z
          .string()
          .trim()
          .min(1)
          .describe("ID de Mongo del producto a editar."),
        attributes: z
          .record(
            z.string().min(1).max(60),
            z.array(z.string().min(1).max(200)).max(50)
          )
          .describe(
            "Mapa de atributos completo. Claves: nombre del atributo (ej: 'preocupacion', 'color', 'aroma'). " +
            "Valores: array de strings. Ejemplo: { \"preocupacion\": [\"hidratación\", \"brillo\"], \"color\": [\"rojo\"] }"
          ),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (args, ctx) =>
      run("set_product_attributes", async () => {
        await connectDB();
        const userId = getMcpUserId(ctx);

        if (!mongoose.isValidObjectId(args.id)) {
          throw new ToolInputError("El ID del producto no es válido.");
        }

        // Buscar y verificar que el producto es del usuario autenticado
        const product = await Product.findOne({
          _id: args.id,
          user: userId,
        }).select("_id name attributes");

        if (!product) {
          throw new ToolInputError(
            "No encontré ese producto en tu cuenta. Verificá el ID."
          );
        }

        // Guardar atributos
        await Product.updateOne(
          { _id: args.id, user: userId },
          { $set: { attributes: args.attributes } }
        );

        return {
          success: true,
          productId: String(product._id),
          productName: (product as any).name || "",
          attributes: args.attributes,
          message: "Atributos actualizados correctamente.",
        };
      })
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Helper interno: genera código interno único tipo P100, P101, etc.
  // ─────────────────────────────────────────────────────────────────────────
  async function generateUniqueProductCode(prefix = "P"): Promise<string> {
    const lastProduct = await Product.findOne().sort({ createdAt: -1 });
    const lastCode = (lastProduct as any)?.code || `${prefix}99`;
    const lastNumber = parseInt(lastCode.replace(prefix, "")) || 99;
    return `${prefix}${lastNumber + 1}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // upload_product_image — sube una imagen a Cloudinary y devuelve la URL
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "upload_product_image",
    {
      title: "Subir imagen de producto",
      description:
        "Sube una imagen a Cloudinary y devuelve la URL segura para usarla al crear o editar un producto. " +
        "La imagen se pasa como string Base64 (sin el prefijo data:image/...). " +
        "Límite: 5 MB. Formatos aceptados: jpg, png, webp, gif.",
      inputSchema: z.object({
        base64: z
          .string()
          .min(10)
          .describe(
            "Contenido de la imagen en Base64 puro (sin el prefijo 'data:image/...;base64,'). " +
            "Tamaño máximo: 5 MB."
          ),
        mimeType: z
          .enum(["image/jpeg", "image/png", "image/webp", "image/gif"])
          .describe("Tipo MIME de la imagen."),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async (args, _ctx) =>
      run("upload_product_image", async () => {
        const approxBytes = Math.ceil(args.base64.length * 0.75);
        if (approxBytes > 5 * 1024 * 1024) {
          throw new ToolInputError(
            "La imagen excede el límite de 5 MB. Comprimila antes de subirla."
          );
        }

        const dataUri = `data:${args.mimeType};base64,${args.base64}`;
        const result = await cloudinary.uploader.upload(dataUri, {
          folder: "products",
          resource_type: "auto",
        });

        return {
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        };
      })
  );

  // ─────────────────────────────────────────────────────────────────────────
  // create_product — ESCRITURA: crea un nuevo producto
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "create_product",
    {
      title: "Crear producto",
      description:
        "Crea un nuevo producto en el catálogo del usuario autenticado. " +
        "El código interno y el código de barras EAN-13 se generan automáticamente. " +
        "Para subir imágenes, primero usá upload_product_image para obtener la URL, " +
        "luego pasá esa URL en el campo image o images.",
      inputSchema: z.object({
        name: z
          .string()
          .trim()
          .min(1)
          .max(200)
          .describe("Nombre del producto. Requerido."),
        description: z
          .string()
          .max(5000)
          .optional()
          .describe("Descripción del producto."),
        brand: z
          .string()
          .trim()
          .max(100)
          .optional()
          .describe("Marca del producto (ej: 'L Oreal', 'Maybelline')."),
        category: z
          .string()
          .trim()
          .max(100)
          .optional()
          .describe("Nombre exacto de la categoría. Debe existir en el catálogo."),
        sellPrice: z
          .number()
          .nonnegative()
          .describe("Precio de venta al público. Requerido."),
        buyPrice: z
          .number()
          .nonnegative()
          .optional()
          .describe("Precio de costo (no se expone en el MCP público)."),
        wholesalePrice: z
          .number()
          .nonnegative()
          .optional()
          .describe("Precio mayorista."),
        stock: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Stock inicial. Por defecto 0."),
        published: z
          .boolean()
          .optional()
          .describe("Si se publica en la tienda pública. Por defecto false."),
        image: z
          .string()
          .url()
          .optional()
          .describe(
            "URL de la imagen principal. Obtenerla primero con upload_product_image."
          ),
        images: z
          .array(z.string().url())
          .max(10)
          .optional()
          .describe(
            "URLs de imágenes adicionales. Obtenerlas primero con upload_product_image."
          ),
        attributes: z
          .record(
            z.string().min(1).max(60),
            z.array(z.string().min(1).max(200)).max(50)
          )
          .optional()
          .describe(
            "Atributos dinámicos. Ej: { \"preocupacion\": [\"hidratacion\"], \"color\": [\"rojo\"] }"
          ),
        sections: z
          .array(
            z.object({
              title: z.string().min(1).max(200),
              content: z.string().max(5000),
            })
          )
          .max(10)
          .optional()
          .describe("Secciones/acordeones del producto (modo de uso, ingredientes, etc.)."),
        hasDiscount: z
          .boolean()
          .optional()
          .describe("Si el producto tiene descuento activo."),
        discountPercentage: z
          .number()
          .min(0)
          .max(100)
          .optional()
          .describe("Porcentaje de descuento (0-100)."),
        store: storeParam,
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (args, ctx) =>
      run("create_product", async () => {
        await connectDB();
        const userId = getMcpUserId(ctx);

        // Resolver tienda
        let storeId: string;
        if (args.store) {
          const store = await resolveStore(userId, args.store);
          storeId = String(store!._id);
        } else {
          const store = await Store.findOne({ user: userId, isActive: true });
          if (!store) {
            throw new ToolInputError(
              "No encontré una tienda activa. Creá una tienda primero."
            );
          }
          storeId = String(store._id);
        }

        // Generar código interno y barcode EAN-13
        const code = await generateUniqueProductCode();
        const barcode = generateArgentineBarcode("EAN13");

        // Calcular precio descontado
        const sellPrice = args.sellPrice;
        const hasDiscount = args.hasDiscount ?? false;
        const discountPercentage = args.discountPercentage ?? 0;
        const discountedPrice =
          hasDiscount && discountPercentage > 0
            ? sellPrice * (1 - discountPercentage / 100)
            : sellPrice;

        const brand = (args.brand || "").trim();

        const newProduct = await Product.create({
          name: args.name,
          description: args.description || "",
          brand,
          brandSlug: brand ? slugify(brand, { lower: true, strict: true }) : "",
          category: args.category || "",
          sellPrice: sellPrice.toFixed(2),
          buyPrice: (args.buyPrice ?? 0).toFixed(2),
          wholesalePrice: (args.wholesalePrice ?? 0).toFixed(2),
          stock: args.stock ?? 0,
          published: args.published ?? false,
          image: args.image || null,
          images: args.images || [],
          attributes: args.attributes || {},
          sections: args.sections || [],
          hasDiscount,
          discountPercentage,
          discountedPrice: discountedPrice.toFixed(2),
          code,
          barcode,
          user: userId,
          store: storeId,
          views: 0,
        });

        return {
          success: true,
          product: serializeProduct(newProduct),
          code,
          barcode,
          message: "Producto creado exitosamente.",
        };
      })
  );

  // ─────────────────────────────────────────────────────────────────────────
  // update_product — ESCRITURA: edita un producto existente
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "update_product",
    {
      title: "Editar producto",
      description:
        "Actualiza los datos de un producto propio. Solo se modifican los campos que se envíen; " +
        "los omitidos quedan igual. Para reemplazar imágenes usá upload_product_image primero. " +
        "No modifica el código interno ni el código de barras.",
      inputSchema: z.object({
        id: z
          .string()
          .trim()
          .min(1)
          .describe("ID de Mongo del producto a editar."),
        name: z.string().trim().min(1).max(200).optional().describe("Nombre."),
        description: z.string().max(5000).optional().describe("Descripcion."),
        brand: z.string().trim().max(100).optional().describe("Marca."),
        category: z
          .string()
          .trim()
          .max(100)
          .optional()
          .describe("Categoria (nombre exacto)."),
        sellPrice: z
          .number()
          .nonnegative()
          .optional()
          .describe("Precio de venta."),
        buyPrice: z
          .number()
          .nonnegative()
          .optional()
          .describe("Precio de costo."),
        wholesalePrice: z
          .number()
          .nonnegative()
          .optional()
          .describe("Precio mayorista."),
        stock: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Stock."),
        published: z
          .boolean()
          .optional()
          .describe("Publicado en tienda publica."),
        image: z
          .string()
          .url()
          .optional()
          .describe("Nueva URL de imagen principal."),
        images: z
          .array(z.string().url())
          .max(10)
          .optional()
          .describe(
            "Lista completa de imagenes adicionales (reemplaza las existentes)."
          ),
        attributes: z
          .record(
            z.string().min(1).max(60),
            z.array(z.string().min(1).max(200)).max(50)
          )
          .optional()
          .describe("Atributos dinamicos completos (reemplaza los existentes)."),
        sections: z
          .array(
            z.object({
              title: z.string().min(1).max(200),
              content: z.string().max(5000),
            })
          )
          .max(10)
          .optional()
          .describe("Secciones del producto."),
        hasDiscount: z.boolean().optional().describe("Tiene descuento?"),
        discountPercentage: z
          .number()
          .min(0)
          .max(100)
          .optional()
          .describe("Porcentaje de descuento."),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (args, ctx) =>
      run("update_product", async () => {
        await connectDB();
        const userId = getMcpUserId(ctx);

        if (!mongoose.isValidObjectId(args.id)) {
          throw new ToolInputError("El ID del producto no es valido.");
        }

        const existing = await Product.findOne({
          _id: args.id,
          user: userId,
        });
        if (!existing) {
          throw new ToolInputError(
            "No encontre ese producto en tu cuenta. Verifica el ID."
          );
        }

        const updateFields: Record<string, unknown> = {};

        if (args.name !== undefined) updateFields.name = args.name;
        if (args.description !== undefined)
          updateFields.description = args.description;
        if (args.category !== undefined) updateFields.category = args.category;
        if (args.stock !== undefined) updateFields.stock = args.stock;
        if (args.published !== undefined) updateFields.published = args.published;
        if (args.image !== undefined) updateFields.image = args.image;
        if (args.images !== undefined) updateFields.images = args.images;
        if (args.attributes !== undefined)
          updateFields.attributes = args.attributes;
        if (args.sections !== undefined) updateFields.sections = args.sections;

        if (args.brand !== undefined) {
          const brand = args.brand.trim();
          updateFields.brand = brand;
          updateFields.brandSlug = brand
            ? slugify(brand, { lower: true, strict: true })
            : "";
        }

        // Precios (guardados como string con 2 decimales)
        const sellPrice =
          args.sellPrice !== undefined
            ? args.sellPrice
            : toNumber((existing as any).sellPrice);
        const hasDiscount =
          args.hasDiscount !== undefined
            ? args.hasDiscount
            : Boolean((existing as any).hasDiscount);
        const discountPercentage =
          args.discountPercentage !== undefined
            ? args.discountPercentage
            : toNumber((existing as any).discountPercentage);

        if (args.sellPrice !== undefined)
          updateFields.sellPrice = sellPrice.toFixed(2);
        if (args.buyPrice !== undefined)
          updateFields.buyPrice = args.buyPrice.toFixed(2);
        if (args.wholesalePrice !== undefined)
          updateFields.wholesalePrice = args.wholesalePrice.toFixed(2);
        if (
          args.hasDiscount !== undefined ||
          args.discountPercentage !== undefined ||
          args.sellPrice !== undefined
        ) {
          const discounted =
            hasDiscount && discountPercentage > 0
              ? sellPrice * (1 - discountPercentage / 100)
              : sellPrice;
          updateFields.hasDiscount = hasDiscount;
          updateFields.discountPercentage = discountPercentage;
          updateFields.discountedPrice = discounted.toFixed(2);
        }

        if (Object.keys(updateFields).length === 0) {
          throw new ToolInputError(
            "No enviaste ningun campo para actualizar."
          );
        }

        const updated = await Product.findOneAndUpdate(
          { _id: args.id, user: userId },
          updateFields,
          { new: true, runValidators: true }
        );

        return {
          success: true,
          product: serializeProduct(updated),
          message: "Producto actualizado correctamente.",
        };
      })
  );

  // ─────────────────────────────────────────────────────────────────────────
  // create_category — ESCRITURA: crea una nueva categoría
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "create_category",
    {
      title: "Crear categoria",
      description:
        "Crea una nueva categoria en el catalogo del usuario autenticado. " +
        "Si ya existe una con el mismo nombre en la tienda, devuelve error.",
      inputSchema: z.object({
        name: z
          .string()
          .trim()
          .min(1)
          .max(100)
          .describe("Nombre de la categoria. Requerido y unico por tienda."),
        description: z
          .string()
          .max(500)
          .optional()
          .describe("Descripcion opcional."),
        color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional()
          .describe("Color en hex (ej: '#3B82F6'). Por defecto azul."),
        icon: z
          .string()
          .max(10)
          .optional()
          .describe("Emoji o icono (ej: 'U+1F484'). Por defecto caja."),
        store: storeParam,
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (args, ctx) =>
      run("create_category", async () => {
        await connectDB();
        const userId = getMcpUserId(ctx);

        let storeId: string;
        if (args.store) {
          const store = await resolveStore(userId, args.store);
          storeId = String(store!._id);
        } else {
          const store = await Store.findOne({ user: userId, isActive: true });
          if (!store) {
            throw new ToolInputError(
              "No encontre una tienda activa. Crea una tienda primero."
            );
          }
          storeId = String(store._id);
        }

        const existing = await Category.findOne({
          user: userId,
          store: storeId,
          name: { $regex: new RegExp(`^${args.name.trim()}$`, "i") },
        });
        if (existing) {
          throw new ToolInputError(
            `Ya existe una categoria llamada "${args.name}" en esa tienda.`
          );
        }

        const category = await Category.create({
          name: args.name.trim(),
          description: (args.description || "").trim(),
          color: args.color || "#3B82F6",
          icon: args.icon || "U+1F4E6",
          user: userId,
          store: storeId,
          isActive: true,
        });

        return {
          success: true,
          category: {
            id: String(category._id),
            name: (category as any).name,
            description: (category as any).description,
            color: (category as any).color,
            icon: (category as any).icon,
            store: storeId,
          },
          message: "Categoria creada exitosamente.",
        };
      })
  );

  // ─────────────────────────────────────────────────────────────────────────
  // update_category — ESCRITURA: edita una categoría existente
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "update_category",
    {
      title: "Editar categoria",
      description:
        "Actualiza una categoria propia. Solo se modifican los campos enviados. " +
        "Si se cambia el nombre, se valida que no exista otra con el mismo nombre en la tienda.",
      inputSchema: z.object({
        id: z
          .string()
          .trim()
          .min(1)
          .describe("ID de Mongo de la categoria a editar."),
        name: z.string().trim().min(1).max(100).optional().describe("Nuevo nombre."),
        description: z.string().max(500).optional().describe("Nueva descripcion."),
        color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional()
          .describe("Color en hex."),
        icon: z.string().max(10).optional().describe("Emoji o icono."),
        isActive: z
          .boolean()
          .optional()
          .describe("Si la categoria esta activa (visible en filtros)."),
        orden: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Orden de aparicion en menus."),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (args, ctx) =>
      run("update_category", async () => {
        await connectDB();
        const userId = getMcpUserId(ctx);

        if (!mongoose.isValidObjectId(args.id)) {
          throw new ToolInputError("El ID de categoria no es valido.");
        }

        const category = await Category.findOne({
          _id: args.id,
          user: userId,
        });
        if (!category) {
          throw new ToolInputError(
            "No encontre esa categoria en tu cuenta. Verifica el ID."
          );
        }

        if (args.name && args.name.trim() !== (category as any).name) {
          const dupe = await Category.findOne({
            user: userId,
            store: (category as any).store,
            name: { $regex: new RegExp(`^${args.name.trim()}$`, "i") },
            _id: { $ne: args.id },
          });
          if (dupe) {
            throw new ToolInputError(
              `Ya existe una categoria llamada "${args.name}" en esa tienda.`
            );
          }
        }

        const updateData: Record<string, unknown> = {};
        if (args.name !== undefined) updateData.name = args.name.trim();
        if (args.description !== undefined)
          updateData.description = args.description.trim();
        if (args.color !== undefined) updateData.color = args.color;
        if (args.icon !== undefined) updateData.icon = args.icon;
        if (args.isActive !== undefined) updateData.isActive = args.isActive;
        if (args.orden !== undefined) updateData.orden = args.orden;

        if (Object.keys(updateData).length === 0) {
          throw new ToolInputError("No enviaste ningun campo para actualizar.");
        }

        const updated = await Category.findByIdAndUpdate(args.id, updateData, {
          new: true,
          runValidators: true,
        });

        return {
          success: true,
          category: {
            id: String(updated!._id),
            name: (updated as any).name,
            description: (updated as any).description,
            color: (updated as any).color,
            icon: (updated as any).icon,
            isActive: (updated as any).isActive,
            orden: (updated as any).orden,
          },
          message: "Categoria actualizada correctamente.",
        };
      })
  );
}