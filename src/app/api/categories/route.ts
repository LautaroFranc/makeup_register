import { NextRequest, NextResponse } from "next/server";
import Category from "@/models/Category";
import Product from "@/models/Product";
import connectDB from "@/config/db";
import { authMiddleware } from "../middleware";

connectDB();

// GET - Obtener todas las categorías del usuario
export async function GET(req: NextRequest) {
  try {
    console.log("GET - Obtener todas las categorías del usuario");
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "true";
    const publicOnly = searchParams.get("public") === "true";

    // Construir query
    const query: any = { user: _id };
    if (!includeInactive) {
      query.isActive = true;
    }

    // Si se solicitan solo categorías públicas, filtrar por categorías que tienen productos publicados
    if (publicOnly) {
      // Obtener categorías que tienen al menos un producto publicado
      const categoriesWithPublicProducts = await Product.distinct("category", {
        user: _id,
        published: true,
      });

      query.name = { $in: categoriesWithPublicProducts };
    }

    const categories = await Category.find(query)
      .sort({ name: 1 })
      .select(
        "name slug description color icon isActive productCount createdAt updatedAt"
      );

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Crear nueva categoría
export async function POST(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const body = await req.json();
    const { name, description, color, icon } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "El nombre de la categoría es requerido" },
        { status: 400 }
      );
    }

    // Verificar si ya existe una categoría con el mismo nombre para este usuario
    const existingCategory = await Category.findOne({
      user: _id,
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });

    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: "Ya existe una categoría con este nombre" },
        { status: 400 }
      );
    }

    const newCategory = await Category.create({
      name: name.trim(),
      description: description?.trim() || "",
      color: color || "#3B82F6",
      icon: icon || "📦",
      user: _id,
    });

    return NextResponse.json(
      {
        success: true,
        category: newCategory,
        message: "Categoría creada exitosamente",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Actualizar categoría
export async function PUT(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const body = await req.json();
    const { categoryId, name, description, color, icon, isActive } = body;

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: "ID de categoría es requerido" },
        { status: 400 }
      );
    }

    // Verificar que la categoría pertenece al usuario
    const category = await Category.findOne({ _id: categoryId, user: _id });
    if (!category) {
      return NextResponse.json(
        { success: false, error: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    // Si se está cambiando el nombre, verificar que no exista otra con el mismo nombre
    if (name && name.trim() !== category.name) {
      const existingCategory = await Category.findOne({
        user: _id,
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
        _id: { $ne: categoryId },
      });

      if (existingCategory) {
        return NextResponse.json(
          { success: false, error: "Ya existe una categoría con este nombre" },
          { status: 400 }
        );
      }
    }

    // Actualizar la categoría
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined)
      updateData.description = description?.trim() || "";
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      category: updatedCategory,
      message: "Categoría actualizada exitosamente",
    });
  } catch (error: any) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar categoría
export async function DELETE(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("id");

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: "ID de categoría es requerido" },
        { status: 400 }
      );
    }

    // Verificar que la categoría pertenece al usuario
    const category = await Category.findOne({ _id: categoryId, user: _id });
    if (!category) {
      return NextResponse.json(
        { success: false, error: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    // Verificar si hay productos usando esta categoría
    const Product = (await import("@/models/Product")).default;
    const productsUsingCategory = await Product.countDocuments({
      user: _id,
      category: category.name,
    });

    if (productsUsingCategory > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No se puede eliminar la categoría porque tiene ${productsUsingCategory} producto(s) asociado(s). Primero mueve o elimina los productos.`,
        },
        { status: 400 }
      );
    }

    // Eliminar la categoría
    await Category.findByIdAndDelete(categoryId);

    return NextResponse.json({
      success: true,
      message: "Categoría eliminada exitosamente",
    });
  } catch (error: any) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
