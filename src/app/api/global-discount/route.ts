import { NextRequest, NextResponse } from "next/server";
import GlobalDiscount from "@/models/GlobalDiscount";
import Store from "@/models/Store";
import connectDB from "@/config/db";
import { authMiddleware } from "../middleware";

connectDB();

// GET - Obtener descuento global del usuario
export async function GET(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;

    const userId = (await authCheck.json()).user._id;

    // Obtener la tienda activa del usuario
    const store = await Store.findOne({ user: userId, isActive: true });
    if (!store) {
      return NextResponse.json(
        {
          success: false,
          error: "No se encontró una tienda activa para el usuario",
        },
        { status: 404 }
      );
    }

    // Buscar descuento global activo
    const globalDiscount = await GlobalDiscount.findOne({
      user: userId,
      store: store._id,
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      globalDiscount: globalDiscount || null,
    });
  } catch (error: any) {
    console.error("Error al obtener descuento global:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener el descuento global",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST - Crear o actualizar descuento global
export async function POST(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;

    const userId = (await authCheck.json()).user._id;
    const body = await req.json();

    // Obtener la tienda activa del usuario
    const store = await Store.findOne({ user: userId, isActive: true });
    if (!store) {
      return NextResponse.json(
        {
          success: false,
          error: "No se encontró una tienda activa para el usuario",
        },
        { status: 404 }
      );
    }

    // Validar datos
    if (!body.name || body.discountPercentage === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Nombre y porcentaje de descuento son requeridos",
        },
        { status: 400 }
      );
    }

    if (body.discountPercentage < 0 || body.discountPercentage > 100) {
      return NextResponse.json(
        {
          success: false,
          error: "El porcentaje debe estar entre 0 y 100",
        },
        { status: 400 }
      );
    }

    // Buscar si ya existe un descuento global
    let globalDiscount = await GlobalDiscount.findOne({
      user: userId,
      store: store._id,
    });

    if (globalDiscount) {
      // Actualizar existente
      globalDiscount.name = body.name;
      globalDiscount.description = body.description || "";
      globalDiscount.discountPercentage = body.discountPercentage;
      globalDiscount.isActive = body.isActive !== undefined ? body.isActive : true;
      globalDiscount.startDate = body.startDate ? new Date(body.startDate) : new Date();
      globalDiscount.endDate = body.endDate ? new Date(body.endDate) : undefined;
      globalDiscount.excludedCategories = body.excludedCategories || [];
      globalDiscount.excludedProducts = body.excludedProducts || [];

      await globalDiscount.save();
    } else {
      // Crear nuevo
      globalDiscount = await GlobalDiscount.create({
        user: userId,
        store: store._id,
        name: body.name,
        description: body.description || "",
        discountPercentage: body.discountPercentage,
        isActive: body.isActive !== undefined ? body.isActive : true,
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        excludedCategories: body.excludedCategories || [],
        excludedProducts: body.excludedProducts || [],
      });
    }

    return NextResponse.json(
      {
        success: true,
        globalDiscount,
        message: "Descuento global guardado exitosamente",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error al crear/actualizar descuento global:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al guardar el descuento global",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar descuento global
export async function DELETE(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;

    const userId = (await authCheck.json()).user._id;

    // Obtener la tienda activa del usuario
    const store = await Store.findOne({ user: userId, isActive: true });
    if (!store) {
      return NextResponse.json(
        {
          success: false,
          error: "No se encontró una tienda activa para el usuario",
        },
        { status: 404 }
      );
    }

    // Eliminar descuento global
    const result = await GlobalDiscount.deleteOne({
      user: userId,
      store: store._id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No se encontró un descuento global para eliminar",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Descuento global eliminado exitosamente",
    });
  } catch (error: any) {
    console.error("Error al eliminar descuento global:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al eliminar el descuento global",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
