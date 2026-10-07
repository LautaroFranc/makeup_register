import { NextRequest, NextResponse } from "next/server";
import Product from "@/models/Product";
import GlobalDiscount from "@/models/GlobalDiscount";
import Store from "@/models/Store";
import connectDB from "@/config/db";
import { authMiddleware } from "../../middleware";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Filtros
    const category = searchParams.get("category");
    const published = searchParams.get("published");
    const stockFilter = searchParams.get("stock"); // "in-stock", "low-stock", "out-of-stock"
    const search = searchParams.get("search");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    // Construir filtros de consulta
    const query: any = {
      user: _id,
    };

    // Filtro de visibilidad
    if (published && published !== "all") {
      query.published = published === "true";
    }

    // Filtro de categoría
    if (category && category !== "all") {
      query.category = category;
    }

    // Filtro de stock
    if (stockFilter && stockFilter !== "all") {
      switch (stockFilter) {
        case "in-stock":
          query.stock = { $gt: 0 };
          break;
        case "low-stock":
          query.stock = { $gt: 0, $lte: 5 };
          break;
        case "out-of-stock":
          query.stock = 0;
          break;
      }
    }

    // Filtro de búsqueda
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    // Filtro por rango de precios (sellPrice almacenado como string)
    const priceFilters: any[] = [];
    if (minPrice) {
      priceFilters.push({
        $expr: { $gte: [{ $toDouble: "$sellPrice" }, parseFloat(minPrice)] },
      });
    }
    if (maxPrice) {
      priceFilters.push({
        $expr: { $lte: [{ $toDouble: "$sellPrice" }, parseFloat(maxPrice)] },
      });
    }
    if (priceFilters.length) {
      query.$and = [...(query.$and || []), ...priceFilters];
    }

    // Obtener productos con filtros y paginación
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Obtener la tienda activa del usuario
    const store = await Store.findOne({ user: _id, isActive: true });

    // Obtener el descuento global activo si existe
    let globalDiscount = null;
    if (store) {
      globalDiscount = await GlobalDiscount.findOne({
        user: _id,
        store: store._id,
        isActive: true,
      });
    }

    // Aplicar descuento global a productos que no tienen descuento individual
    const productsWithDiscount = products.map((product) => {
      const productObj = product.toObject();

      // Si el producto ya tiene descuento individual, no aplicar el global
      if (productObj.hasDiscount && productObj.discountPercentage > 0) {
        return productObj;
      }

      // Si hay descuento global activo, aplicarlo
      if (globalDiscount) {
        const now = new Date();
        const isWithinDateRange =
          (!globalDiscount.endDate || new Date(globalDiscount.endDate) >= now);

        if (isWithinDateRange) {
          const sellPrice = parseFloat(productObj.sellPrice);
          const discountedPrice = sellPrice * (1 - globalDiscount.discountPercentage / 100);

          return {
            ...productObj,
            hasDiscount: true,
            discountPercentage: globalDiscount.discountPercentage,
            discountedPrice: discountedPrice.toFixed(2),
            discountStartDate: globalDiscount.startDate,
            discountEndDate: globalDiscount.endDate,
            isGlobalDiscount: true, // Flag para indicar que es descuento global
          };
        }
      }

      return productObj;
    });

    // Calcular resumen de la selección filtrada (totales sin paginación)
    const allFilteredProducts = await Product.find(query);
    let filteredTotalStock = 0;
    let filteredValorSinDescuento = 0;
    let filteredValorConDescuento = 0;

    const now = new Date();
    const isGlobalDiscountActive =
      globalDiscount &&
      (!globalDiscount.endDate || new Date(globalDiscount.endDate) >= now);

    allFilteredProducts.forEach((p) => {
      const pObj = p.toObject();
      const stock = pObj.stock || 0;
      const sellPrice = parseFloat(pObj.sellPrice || "0") || 0;

      filteredTotalStock += stock;
      filteredValorSinDescuento += sellPrice * stock;

      let discountedPrice = sellPrice;
      if (pObj.hasDiscount && pObj.discountPercentage > 0) {
        discountedPrice = sellPrice * (1 - pObj.discountPercentage / 100);
      } else if (isGlobalDiscountActive && globalDiscount) {
        discountedPrice = sellPrice * (1 - globalDiscount.discountPercentage / 100);
      }

      filteredValorConDescuento += discountedPrice * stock;
    });

    const filteredDescuentoTotal = filteredValorSinDescuento - filteredValorConDescuento;

    const totalProducts = allFilteredProducts.length;
    const totalPages = Math.ceil(totalProducts / limit);
    const availableCategories = await Product.distinct("category", {
      user: _id,
    });

    return NextResponse.json({
      success: true,
      products: productsWithDiscount,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit,
      },
      filteredSummary: {
        totalProducts,
        totalStock: filteredTotalStock,
        valorSinDescuento: Number(filteredValorSinDescuento.toFixed(2)),
        valorConDescuento: Number(filteredValorConDescuento.toFixed(2)),
        descuentoTotal: Number(filteredDescuentoTotal.toFixed(2)),
      },
      filters: {
        availableCategories,
        appliedFilters: {
          category,
          published,
          stock: stockFilter,
          search,
          minPrice,
          maxPrice,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching private products:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
