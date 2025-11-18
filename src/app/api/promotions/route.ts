import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Promotion from "@/models/Promotion";
import Product from "@/models/Product";
import { authMiddleware } from "../middleware";

connectDB();

// GET - Obtener todas las promociones del usuario
export async function GET(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const userId = (await authCheck.json()).user._id;

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("isActive");
    const type = searchParams.get("type");

    // Construir query
    const query: any = { user: userId };
    if (isActive !== null) {
      query.isActive = isActive === "true";
    }
    if (type) {
      query.type = type;
    }

    const promotions = await Promotion.find(query)
      .sort({ createdAt: -1 })
      .populate("product", "name image buyPrice sellPrice stock")
      .populate("giftProduct", "name image buyPrice sellPrice stock");

    return NextResponse.json({
      success: true,
      promotions,
      total: promotions.length,
    });
  } catch (error: any) {
    console.error("Error al obtener promociones:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener las promociones",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST - Crear nueva promoción
export async function POST(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const userId = (await authCheck.json()).user._id;

    const body = await req.json();
    const {
      name,
      type = "2x1",
      product,
      giftProduct, // ID del producto regalo (opcional)
      specialPrice,
      margin,
      startDate,
      endDate,
      isActive = true,
      description,
    } = body;

    // Validar datos requeridos
    if (!name) {
      return NextResponse.json(
        { success: false, error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    if (!product) {
      return NextResponse.json(
        { success: false, error: "El producto es requerido" },
        { status: 400 }
      );
    }

    if (specialPrice === undefined || specialPrice < 0) {
      return NextResponse.json(
        { success: false, error: "El precio especial es requerido y debe ser mayor o igual a 0" },
        { status: 400 }
      );
    }

    // Verificar que el producto existe y pertenece al usuario
    const productDoc = await Product.findOne({ _id: product, user: userId });
    if (!productDoc) {
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // Si hay producto regalo, verificar que existe y pertenece al usuario
    let giftProductDoc = null;
    if (giftProduct) {
      giftProductDoc = await Product.findOne({ _id: giftProduct, user: userId });
      if (!giftProductDoc) {
        return NextResponse.json(
          { success: false, error: "Producto regalo no encontrado" },
          { status: 404 }
        );
      }
    }

    // Crear la promoción con todos los datos
    const promotionData: any = {
      name: name.trim(),
      type,
      product,
      productName: productDoc.name,
      productBuyPrice: parseFloat(productDoc.buyPrice),
      productSellPrice: parseFloat(productDoc.sellPrice),
      specialPrice,
      margin,
      startDate: startDate || new Date(),
      endDate: endDate || null,
      isActive,
      user: userId,
      description: description?.trim(),
    };

    // Agregar datos del producto regalo si existe
    if (giftProductDoc) {
      promotionData.giftProduct = giftProduct;
      promotionData.giftProductName = giftProductDoc.name;
      promotionData.giftProductBuyPrice = parseFloat(giftProductDoc.buyPrice);
      promotionData.giftProductSellPrice = parseFloat(giftProductDoc.sellPrice);
    }

    const promotion = new Promotion(promotionData);

    await promotion.save();

    return NextResponse.json(
      {
        success: true,
        message: "Promoción creada exitosamente",
        promotion,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al crear promoción:", error);

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return NextResponse.json(
        {
          success: false,
          error: "Error de validación: " + validationErrors.join(", "),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Error al crear la promoción",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT - Actualizar promoción
export async function PUT(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const userId = (await authCheck.json()).user._id;

    const { searchParams } = new URL(req.url);
    const promotionId = searchParams.get("id");

    if (!promotionId) {
      return NextResponse.json(
        { success: false, error: "El ID de la promoción es requerido" },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Verificar que la promoción pertenece al usuario
    const promotion = await Promotion.findOne({
      _id: promotionId,
      user: userId,
    });

    if (!promotion) {
      return NextResponse.json(
        { success: false, error: "Promoción no encontrada" },
        { status: 404 }
      );
    }

    // Actualizar campos
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.type !== undefined) updateData.type = body.type;
    if (body.specialPrice !== undefined) updateData.specialPrice = body.specialPrice;
    if (body.margin !== undefined) updateData.margin = body.margin;
    if (body.startDate !== undefined) updateData.startDate = body.startDate;
    if (body.endDate !== undefined) updateData.endDate = body.endDate;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.description !== undefined) updateData.description = body.description?.trim();

    const updatedPromotion = await Promotion.findByIdAndUpdate(
      promotionId,
      updateData,
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Promoción actualizada exitosamente",
      promotion: updatedPromotion,
    });
  } catch (error: any) {
    console.error("Error al actualizar promoción:", error);

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return NextResponse.json(
        {
          success: false,
          error: "Error de validación: " + validationErrors.join(", "),
        },
        { status: 400 }
      );
    }

    if (error.name === "CastError") {
      return NextResponse.json(
        { success: false, error: "ID de promoción inválido" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Error al actualizar la promoción",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar promoción
export async function DELETE(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const userId = (await authCheck.json()).user._id;

    const { searchParams } = new URL(req.url);
    const promotionId = searchParams.get("id");

    if (!promotionId) {
      return NextResponse.json(
        { success: false, error: "El ID de la promoción es requerido" },
        { status: 400 }
      );
    }

    // Verificar que la promoción pertenece al usuario
    const promotion = await Promotion.findOne({
      _id: promotionId,
      user: userId,
    });

    if (!promotion) {
      return NextResponse.json(
        { success: false, error: "Promoción no encontrada" },
        { status: 404 }
      );
    }

    await Promotion.findByIdAndDelete(promotionId);

    return NextResponse.json({
      success: true,
      message: "Promoción eliminada exitosamente",
    });
  } catch (error: any) {
    console.error("Error al eliminar promoción:", error);

    if (error.name === "CastError") {
      return NextResponse.json(
        { success: false, error: "ID de promoción inválido" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Error al eliminar la promoción",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
