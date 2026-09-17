import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Product from "@/models/Product";
import { verifyToken } from "@/app/api/middleware";

connectDB();

// PATCH: Actualización masiva de precios mayoristas
export async function PATCH(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    const body = await req.json();
    const discountPercentage = Number(body.discountPercentage) || 10;

    if (discountPercentage < 0 || discountPercentage > 100) {
      return NextResponse.json(
        { success: false, error: "El porcentaje debe estar entre 0 y 100" },
        { status: 400 }
      );
    }

    // Obtener todos los productos del usuario
    const userProducts = await Product.find({ user: userId });

    if (userProducts.length === 0) {
      return NextResponse.json(
        { success: false, error: "No se encontraron productos para actualizar" },
        { status: 404 }
      );
    }

    const factor = (100 - discountPercentage) / 100;
    let updatedCount = 0;

    // Calcular y actualizar el precio mayorista de cada producto
    const bulkOps = userProducts.map((prod) => {
      const minoristaPrice = parseFloat(prod.sellPrice) || 0;
      const wholesaleCalculated = Math.round(minoristaPrice * factor);

      return {
        updateOne: {
          filter: { _id: prod._id, user: userId },
          update: {
            $set: {
              wholesalePrice: wholesaleCalculated.toString(),
            },
          },
        },
      };
    });

    if (bulkOps.length > 0) {
      const bulkResult = await Product.bulkWrite(bulkOps);
      updatedCount = bulkResult.modifiedCount || bulkOps.length;
    }

    return NextResponse.json({
      success: true,
      message: `Precios mayoristas generados exitosamente (${discountPercentage}% desc.)`,
      updatedCount,
    });
  } catch (error: any) {
    console.error("Error al generar precios mayoristas masivos:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno al calcular y guardar los precios mayoristas",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
