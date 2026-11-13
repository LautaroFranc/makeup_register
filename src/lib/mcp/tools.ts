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
          .describe("Texto a buscar en nombre, marca, descripción o categoría."),
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
          ];
        }

        if (args.category) query.category = args.category;
        if (args.brand) {
          query.brand = new RegExp(`^${escapeRegex(args.brand)}$`, "i");
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
}
