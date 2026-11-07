import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import connectDB from "@/config/db";
import Product from "@/models/Product";
import Combo from "@/models/Combo";
import Store from "@/models/Store";
import Users from "@/models/Users";
import { generateArgentineBarcode } from "@/lib/barcodeUtils";
import slugify from "slugify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

connectDB();

async function resolveDefaultContext() {
  await connectDB();
  const store: any = await Store.findOne({ isActive: true });
  if (store) {
    return { storeId: store._id.toString(), userId: store.user.toString() };
  }
  const user: any = await Users.findOne();
  if (user) {
    const userStore: any = await Store.findOne({ user: user._id });
    return { storeId: userStore?._id.toString() || "", userId: user._id.toString() };
  }
  throw new Error("No se encontró ninguna tienda o usuario activo en la base de datos.");
}

async function generateUniqueProductCode(prefix = "P") {
  const lastProduct = await Product.findOne().sort({ createdAt: -1 });
  const lastCode = lastProduct?.code || `${prefix}99`;
  const lastNumber = parseInt(lastCode.replace(prefix, "")) || 99;
  return `${prefix}${lastNumber + 1}`;
}

const handler = createMcpHandler((server: any) => {
  // 1. LISTAR PRODUCTOS
  server.registerTool(
    "list_products",
    {
      description: "Lista productos del inventario con opciones de búsqueda, filtro por categoría, marca o estado de stock.",
      inputSchema: {
        search: z.string().optional().describe("Texto para buscar en nombre, marca o categoría"),
        category: z.string().optional().describe("Filtrar por categoría (ej: Peluquería, Manicuría, Rostro)"),
        brand: z.string().optional().describe("Filtrar por marca"),
        stockStatus: z
          .enum(["all", "in_stock", "low_stock", "out_of_stock"])
          .optional()
          .describe("Filtrar por estado de stock"),
        limit: z.number().optional().default(50).describe("Límite de productos a retornar (máx 100)"),
      },
    },
    async ({ search, category, brand, stockStatus = "all", limit = 50 }: any) => {
      await connectDB();
      const query: any = {};

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { brand: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
        ];
      }

      if (category) {
        query.category = { $regex: new RegExp(`^${category}$`, "i") };
      }

      if (brand) {
        query.brand = { $regex: new RegExp(`^${brand}$`, "i") };
      }

      if (stockStatus === "in_stock") {
        query.stock = { $gt: 0 };
      } else if (stockStatus === "low_stock") {
        query.stock = { $gt: 0, $lte: 5 };
      } else if (stockStatus === "out_of_stock") {
        query.stock = { $lte: 0 };
      }

      const safeLimit = Math.min(Math.max(limit, 1), 100);
      const products = await Product.find(query)
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .lean();

      const formatted = products.map((p: any) => {
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

  // 2. DETALLE DE UN PRODUCTO
  server.registerTool(
    "get_product_detail",
    {
      description: "Obtiene la ficha técnica y detalle completo de un producto por ID o código de barras, incluyendo secciones (acordeones), atributos y precios.",
      inputSchema: {
        productId: z.string().describe("ID de MongoDB o código de barras del producto"),
      },
    },
    async ({ productId }: any) => {
      await connectDB();
      const isObjectId = productId.match(/^[0-9a-fA-F]{24}$/);
      const query = isObjectId ? { _id: productId } : { $or: [{ barcode: productId }, { code: productId }] };

      const product = await Product.findOne(query).lean();
      if (!product) {
        return {
          content: [{ type: "text", text: `Error: No se encontró el producto con identificador "${productId}".` }],
        };
      }

      const p: any = product;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                id: p._id.toString(),
                name: p.name,
                code: p.code,
                barcode: p.barcode,
                description: p.description,
                sections: p.sections || [],
                category: p.category,
                brand: p.brand,
                buyPrice: parseFloat(p.buyPrice),
                sellPrice: parseFloat(p.sellPrice),
                wholesalePrice: parseFloat(p.wholesalePrice || "0"),
                stock: p.stock,
                attributes: p.attributes || {},
                hasDiscount: p.hasDiscount,
                discountPercentage: p.discountPercentage,
                discountedPrice: p.discountedPrice,
                published: p.published,
                views: p.views || 0,
                images: p.images || [],
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
  server.registerTool(
    "create_product",
    {
      description: "Crea un nuevo producto en el inventario con código y código de barras argentino EAN-13 generados automáticamente.",
      inputSchema: {
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
      },
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
    }: any) => {
      await connectDB();
      const context = await resolveDefaultContext();

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
                mensaje: "Producto creado exitosamente",
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
  server.registerTool(
    "update_product",
    {
      description: "Modifica los datos de un producto existente (precios, stock, descripción, secciones/acordeones, descuentos o visibilidad).",
      inputSchema: {
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
    },
    async ({ productId, ...updates }: any) => {
      await connectDB();

      const product: any = await Product.findById(productId);
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

  // 5. LISTAR COMBOS
  server.registerTool(
    "list_combos",
    {
      description: "Lista todos los combos configurados, sus productos componentes, precio promocional y ahorro generado.",
      inputSchema: {
        activeOnly: z.boolean().optional().default(false).describe("Si es true, solo devuelve combos activos y publicados"),
      },
    },
    async ({ activeOnly = false }: any) => {
      await connectDB();
      const query = activeOnly ? { isActive: true, published: true } : {};

      const combos = await Combo.find(query).sort({ createdAt: -1 }).lean();

      const formatted = combos.map((c: any) => ({
        id: c._id.toString(),
        name: c.name,
        description: c.description || "",
        comboPrice: c.comboPrice,
        totalNormalPrice: c.totalNormalPrice,
        savings: c.savings,
        savingsPercentage:
          c.totalNormalPrice > 0 ? (((c.savings) / c.totalNormalPrice) * 100).toFixed(1) + "%" : "0%",
        itemsCount: c.items?.length || 0,
        items: c.items?.map((it: any) => ({
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
  server.registerTool(
    "create_combo",
    {
      description: "Crea un combo agrupando productos existentes, calculando automáticamente el precio normal total y el ahorro para el cliente.",
      inputSchema: {
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
      },
    },
    async ({ name, comboPrice, items, description = "", published = true }: any) => {
      await connectDB();
      const context = await resolveDefaultContext();

      if (!items || items.length === 0) {
        return { content: [{ type: "text", text: "Error: El combo debe tener al menos un producto." }] };
      }

      const populatedItems: any[] = [];
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

      const newCombo: any = await Combo.create({
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
  server.registerTool(
    "update_combo",
    {
      description: "Modifica un combo existente (precio promocional, nombre, descripción, estado activo o productos componentes).",
      inputSchema: {
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
    },
    async ({ comboId, ...updates }: any) => {
      await connectDB();

      const combo: any = await Combo.findById(comboId);
      if (!combo) {
        return { content: [{ type: "text", text: `Error: Combo no encontrado con ID ${comboId}.` }] };
      }

      if (updates.name !== undefined) combo.name = updates.name;
      if (updates.description !== undefined) combo.description = updates.description;
      if (updates.published !== undefined) combo.published = updates.published;
      if (updates.isActive !== undefined) combo.isActive = updates.isActive;

      if (updates.items !== undefined) {
        const populatedItems: any[] = [];
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

  // 8. ANÁLISIS INTEGRAL DE INVENTARIO PARA LA IA
  server.registerTool(
    "analyze_inventory",
    {
      description: "Genera un reporte ejecutivo completo del inventario: valorización a costo, valorización a venta, margen promedio, alertas de stock y métricas para tomar decisiones comerciales.",
      inputSchema: {},
    },
    async () => {
      await connectDB();

      const [products, combos] = await Promise.all([
        Product.find().lean(),
        Combo.find().lean(),
      ]);

      let totalValuationCost = 0;
      let totalValuationSell = 0;
      let totalStockUnits = 0;
      const outOfStockList: any[] = [];
      const lowStockList: any[] = [];
      const categoryCount: Record<string, number> = {};
      const brandCount: Record<string, number> = {};

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

        const brand = p.brand || "Sin marca";
        brandCount[brand] = (brandCount[brand] || 0) + 1;
      });

      const potentialGrossProfit = totalValuationSell - totalValuationCost;
      const overallMargin =
        totalValuationCost > 0
          ? ((potentialGrossProfit / totalValuationCost) * 100).toFixed(1) + "%"
          : "0%";

      const topViewed = [...products]
        .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
        .slice(0, 5)
        .map((p: any) => ({
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
});

export { handler as GET, handler as POST, handler as DELETE };
