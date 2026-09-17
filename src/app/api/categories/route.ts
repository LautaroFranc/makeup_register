import { NextRequest, NextResponse } from "next/server";
import Category from "@/models/Category";
import Product from "@/models/Product";
import connectDB from "@/config/db";
import { authMiddleware } from "../middleware";

export const dynamic = "force-dynamic";

connectDB();

// GET - Obtener todas las categorías del usuario
export async function GET(req: NextRequest) {
  try {
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
      .sort({ orden: 1, name: 1 })
      .select(
        "name slug description color icon isActive productCount orden createdAt updatedAt"
      );

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener las categorías. Por favor intenta nuevamente.",
        details: error.message
      },
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
    const { name, description, color, icon, storeId } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "El nombre de la categoría es requerido" },
        { status: 400 }
      );
    }

    // Resolver tienda destino
    let targetStoreId = storeId as string | undefined;

    if (targetStoreId) {
      // Validar que la tienda pertenezca al usuario
      const Store = (await import("@/models/Store")).default;
      const store = await Store.findOne({ _id: targetStoreId, user: _id });
      if (!store) {
        return NextResponse.json(
          {
            success: false,
            error: "La tienda especificada no existe o no pertenece al usuario",
          },
          { status: 400 }
        );
      }
    } else {
      // Tomar la primera tienda activa del usuario
      const Store = (await import("@/models/Store")).default;
      const store = await Store.findOne({ user: _id, isActive: true });
      if (!store) {
        return NextResponse.json(
          {
            success: false,
            error: "No se encontró una tienda activa. Por favor crea una tienda primero.",
          },
          { status: 400 }
        );
      }
      targetStoreId = store._id.toString();
    }

    // Verificar si ya existe una categoría con el mismo nombre para este usuario y tienda
    const existingCategory = await Category.findOne({
      user: _id,
      store: targetStoreId,
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });

    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: "Ya existe una categoría con este nombre en esta tienda" },
        { status: 400 }
      );
    }

    const newCategory = await Category.create({
      name: name.trim(),
      description: description?.trim() || "",
      color: color || "#3B82F6",
      icon: icon || "📦",
      user: _id,
      store: targetStoreId,
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

    // Manejar errores de validación de Mongoose
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        {
          success: false,
          error: "Error de validación: " + validationErrors.join(", ")
        },
        { status: 400 }
      );
    }

    // Manejar error de clave duplicada
    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: "Ya existe una categoría con ese nombre o identificador único"
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Error al crear la categoría. Por favor intenta nuevamente.",
        details: error.message
      },
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
    const { categoryId, name, description, color, icon, isActive, orden } = body;

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
    if (orden !== undefined) updateData.orden = orden;

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

    // Manejar errores de validación de Mongoose
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        {
          success: false,
          error: "Error de validación: " + validationErrors.join(", ")
        },
        { status: 400 }
      );
    }

    // Manejar error de clave duplicada
    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: "Ya existe una categoría con ese nombre"
        },
        { status: 400 }
      );
    }

    // Manejar error de ID inválido
    if (error.name === "CastError") {
      return NextResponse.json(
        {
          success: false,
          error: "ID de categoría inválido"
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Error al actualizar la categoría. Por favor intenta nuevamente.",
        details: error.message
      },
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

    // Manejar error de ID inválido
    if (error.name === "CastError") {
      return NextResponse.json(
        {
          success: false,
          error: "ID de categoría inválido"
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Error al eliminar la categoría. Por favor intenta nuevamente.",
        details: error.message
      },
      { status: 500 }
    );
  }
}
