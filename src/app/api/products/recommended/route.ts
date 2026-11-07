import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Product from "@/models/Product";
import Store from "@/models/Store";
import Users from "@/models/Users";
import GlobalDiscount from "@/models/GlobalDiscount";
import slugify from "slugify";

connectDB();

const PRODUCT_PROJECTION =
  "name description image images attributes sections sellPrice wholesalePrice category brand brandSlug barcode stock published hasDiscount discountPercentage discountedPrice discountStartDate discountEndDate views";

/**
 * GET /api/products/recommended
 * 
 * Parámetros query:
 * - productId: ID del producto actual que se está viendo (excluido de las recomendaciones).
 * - slug: Slug de la tienda o del usuario (ej: "nova-insumos").
 * - category: Filtrar o priorizar categoría específica.
 * - limit: Cantidad de productos a retornar (default: 4, máx: 20).
 * - type: 
 *     - "related": Misma categoría / marca del producto actual (o especificada).
 *     - "popular" | "best-sellers": Más vistos (views) y con más rotación.
 *     - "deals": Productos con descuentos y ofertas activas.
 *     - "mixed" (default): Prioriza misma categoría, y rellena con populares/ofertas de la tienda.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId")?.trim();
    const slug = searchParams.get("slug")?.trim();
    const categoryParam = searchParams.get("category")?.trim();
    const type = (searchParams.get("type")?.trim().toLowerCase() || "mixed") as
      | "related"
      | "popular"
      | "best-sellers"
      | "deals"
      | "mixed";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "4"), 1), 20);

    let userId: string | null = null;
    let storeId: string | null = null;
    let baseCategory = categoryParam || "";
    let baseBrandSlug = "";

    // 1. Si viene productId, extraer su información de referencia
    let currentProduct: any = null;
    if (productId) {
      currentProduct = await Product.findById(productId);
      if (currentProduct) {
        userId = currentProduct.user?.toString() || null;
        storeId = currentProduct.store?.toString() || null;
        if (!baseCategory) {
          baseCategory = currentProduct.category || "";
        }
        baseBrandSlug = currentProduct.brandSlug || "";
      }
    }

    // 2. Si falta userId o storeId, resolver por slug
    if ((!userId || !storeId) && slug) {
      const store = await Store.findOne({ slug, isActive: true });
      if (store) {
        storeId = store._id.toString();
        userId = store.user?.toString() || null;
      } else {
        const user: any = await Users.findOne({ slug });
        if (user) {
          userId = user._id.toString();
          const activeStore = await Store.findOne({ user: user._id, isActive: true });
          if (activeStore) {
            storeId = activeStore._id.toString();
          }
        }
      }
    }

    // Validar que tengamos al menos un contexto de tienda/usuario
    if (!userId && !storeId) {
      return NextResponse.json(
        {
          success: false,
          error: "Se requiere 'slug' de tienda o un 'productId' válido para calcular recomendaciones.",
        },
        { status: 400 }
      );
    }

    // Filtro base: sólo publicados y con stock
    const baseFilter: any = {
      published: true,
      stock: { $gt: 0 },
    };

    if (storeId) {
      baseFilter.store = storeId;
    } else if (userId) {
      baseFilter.user = userId;
    }

    if (productId) {
      baseFilter._id = { $ne: productId };
    }

    let recommendedProducts: any[] = [];

    // 3. Estrategias de recomendación
    if (type === "deals") {
      // Sólo productos con descuento
      recommendedProducts = await Product.find({
        ...baseFilter,
        hasDiscount: true,
        discountPercentage: { $gt: 0 },
      })
        .sort({ discountPercentage: -1, views: -1, createdAt: -1 })
        .limit(limit)
        .select(PRODUCT_PROJECTION);
    } else if (type === "popular" || type === "best-sellers") {
      // Ordenados por visualizaciones y promociones
      recommendedProducts = await Product.find(baseFilter)
        .sort({ views: -1, hasDiscount: -1, createdAt: -1 })
        .limit(limit)
        .select(PRODUCT_PROJECTION);
    } else if (type === "related") {
      // Priorizar categoría estricta
      if (baseCategory) {
        recommendedProducts = await Product.find({
          ...baseFilter,
          category: { $regex: new RegExp(`^${baseCategory}$`, "i") },
        })
          .sort({ views: -1, hasDiscount: -1, createdAt: -1 })
          .limit(limit)
          .select(PRODUCT_PROJECTION);
      }
    } else {
      // Estrategia "mixed" (Recomendada por defecto para tiendas):
      // Paso 1: Buscar productos de la misma categoría
      if (baseCategory) {
        const categoryMatches = await Product.find({
          ...baseFilter,
          category: { $regex: new RegExp(`^${baseCategory}$`, "i") },
        })
          .sort({ views: -1, hasDiscount: -1, createdAt: -1 })
          .limit(limit)
          .select(PRODUCT_PROJECTION);

        recommendedProducts.push(...categoryMatches);
      }

      // Paso 2: Si aún no llegamos al límite y hay marca, buscar productos de la misma marca
      if (recommendedProducts.length < limit && baseBrandSlug) {
        const existingIds = [
          ...(productId ? [productId] : []),
          ...recommendedProducts.map((p) => p._id.toString()),
        ];

        const brandMatches = await Product.find({
          ...baseFilter,
          _id: { $nin: existingIds },
          brandSlug: baseBrandSlug,
        })
          .sort({ views: -1, hasDiscount: -1, createdAt: -1 })
          .limit(limit - recommendedProducts.length)
          .select(PRODUCT_PROJECTION);

        recommendedProducts.push(...brandMatches);
      }

      // Paso 3: Si aún faltan productos para completar el límite, rellenar con los más vistos/destacados
      if (recommendedProducts.length < limit) {
        const existingIds = [
          ...(productId ? [productId] : []),
          ...recommendedProducts.map((p) => p._id.toString()),
        ];

        const fillerProducts = await Product.find({
          ...baseFilter,
          _id: { $nin: existingIds },
        })
          .sort({ hasDiscount: -1, views: -1, createdAt: -1 })
          .limit(limit - recommendedProducts.length)
          .select(PRODUCT_PROJECTION);

        recommendedProducts.push(...fillerProducts);
      }
    }

    // 4. Aplicar descuento global si existe y está activo
    let globalDiscount = null;
    if (storeId && userId) {
      globalDiscount = await GlobalDiscount.findOne({
        user: userId,
        store: storeId,
        isActive: true,
      });
    }

    const now = new Date();
    const isGlobalActive =
      globalDiscount &&
      (!globalDiscount.endDate || new Date(globalDiscount.endDate) >= now);

    const formattedProducts = recommendedProducts.map((prod) => {
      const p = prod.toObject ? prod.toObject() : prod;

      // Si el producto ya tiene descuento individual, mantenerlo
      if (p.hasDiscount && p.discountPercentage > 0) {
        return p;
      }

      // Si hay descuento global activo, aplicarlo
      if (isGlobalActive && globalDiscount) {
        const sellPrice = parseFloat(p.sellPrice || "0");
        const discountedPrice =
          sellPrice * (1 - globalDiscount.discountPercentage / 100);

        return {
          ...p,
          hasDiscount: true,
          discountPercentage: globalDiscount.discountPercentage,
          discountedPrice: discountedPrice.toFixed(2),
          discountStartDate: globalDiscount.startDate,
          discountEndDate: globalDiscount.endDate,
          isGlobalDiscount: true,
        };
      }

      return p;
    });

    return NextResponse.json({
      success: true,
      count: formattedProducts.length,
      category: baseCategory || null,
      type,
      products: formattedProducts,
    });
  } catch (error: any) {
    console.error("Error fetching recommended products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error interno al obtener productos recomendados",
      },
      { status: 500 }
    );
  }
}
