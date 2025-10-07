import { NextRequest, NextResponse } from "next/server";
import Product from "@/models/Product";
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

    // Contar total de productos con filtros para calcular páginas
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    // Obtener categorías disponibles para este usuario (para filtros)
    const availableCategories = await Product.distinct("category", {
      user: _id,
    });

    return NextResponse.json({
      success: true,
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit,
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
