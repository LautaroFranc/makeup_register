import { NextRequest, NextResponse } from "next/server";
import Category from "@/models/Category";
import connectDB from "@/config/db";
import { authMiddleware } from "../../middleware";

connectDB();

// PUT - Reordenar categorías
export async function PUT(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const body = await req.json();
    const { orderedIds } = body;

    if (!orderedIds || !Array.isArray(orderedIds)) {
      return NextResponse.json(
        { success: false, error: "Se requiere un array de IDs ordenados" },
        { status: 400 }
      );
    }

    // Verificar que todas las categorías pertenecen al usuario
    const categories = await Category.find({
      _id: { $in: orderedIds },
      user: _id,
    });

    if (categories.length !== orderedIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Algunas categorías no fueron encontradas o no pertenecen al usuario",
        },
        { status: 400 }
      );
    }

    // Actualizar el orden de cada categoría
    const updatePromises = orderedIds.map((categoryId, index) => {
      return Category.findByIdAndUpdate(
        categoryId,
        { orden: index },
        { new: true }
      );
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: "Orden de categorías actualizado exitosamente",
    });
  } catch (error: any) {
    console.error("Error reordering categories:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al reordenar las categorías. Por favor intenta nuevamente.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
