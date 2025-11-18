import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Product from "@/models/Product";
import { authMiddleware } from "../../middleware";

connectDB();

/**
 * POST /api/promotions/calculate
 * Calcula el precio óptimo para una promoción 2x1
 *
 * Body:
 * - productId: ID del producto principal (el que se vende)
 * - giftProductId: (opcional) ID del producto regalo. Si no se envía = 2x1 mismo producto
 * - desiredMargin: Margen de ganancia deseado (%) para la promoción
 * - type: Tipo de promoción ("2x1" por defecto)
 */
export async function POST(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const userId = (await authCheck.json()).user._id;

    const body = await req.json();
    const { productId, giftProductId, desiredMargin = 20, type = "2x1" } = body;

    // Validar datos requeridos
    if (!productId) {
      return NextResponse.json(
        { success: false, error: "El ID del producto es requerido" },
        { status: 400 }
      );
    }

    if (desiredMargin < 0 || desiredMargin > 100) {
      return NextResponse.json(
        {
          success: false,
          error: "El margen debe estar entre 0 y 100",
        },
        { status: 400 }
      );
    }

    // Buscar el producto principal
    const product = await Product.findOne({
      _id: productId,
      user: userId,
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    const buyPrice = parseFloat(product.buyPrice);
    const sellPrice = parseFloat(product.sellPrice);

    // Determinar si es 2x1 del mismo producto o productos diferentes
    const isDifferentProducts = !!giftProductId;
    let giftProduct = null;
    let giftBuyPrice = buyPrice; // Por defecto, mismo producto
    let giftSellPrice = sellPrice;

    if (isDifferentProducts) {
      // Buscar el producto regalo
      giftProduct = await Product.findOne({
        _id: giftProductId,
        user: userId,
      });

      if (!giftProduct) {
        return NextResponse.json(
          { success: false, error: "Producto regalo no encontrado" },
          { status: 404 }
        );
      }

      giftBuyPrice = parseFloat(giftProduct.buyPrice);
      giftSellPrice = parseFloat(giftProduct.sellPrice);

      // Validaciones para productos diferentes
      if (giftBuyPrice > buyPrice) {
        return NextResponse.json(
          {
            success: false,
            error: "El producto regalo debe ser más barato que el producto principal",
            details: `Costo regalo ($${giftBuyPrice}) > Costo principal ($${buyPrice})`,
          },
          { status: 400 }
        );
      }

      if (giftProduct.stock <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: "El producto regalo no tiene stock disponible",
          },
          { status: 400 }
        );
      }
    }

    // Calcular métricas del producto principal
    const normalMargin = ((sellPrice - buyPrice) / buyPrice) * 100;
    const normalProfit = sellPrice - buyPrice;

    // Cálculos para 2x1
    const totalCost2x1 = buyPrice + giftBuyPrice; // Costo total de ambos productos
    const clientPays = sellPrice; // El cliente paga el precio normal del producto principal
    const profit2x1 = clientPays - totalCost2x1;
    const actualMargin2x1 = totalCost2x1 > 0 ? (profit2x1 / totalCost2x1) * 100 : 0;

    // Comparación con venta normal
    const normalRevenue2Units = sellPrice + giftSellPrice; // Si vendiera ambos por separado
    const discountAmount = normalRevenue2Units - clientPays;
    const discountPercentage = normalRevenue2Units > 0 ? (discountAmount / normalRevenue2Units) * 100 : 0;

    // Análisis de rentabilidad
    const isRentable = profit2x1 >= 0;
    const marginStatus =
      actualMargin2x1 >= 25
        ? "excelente"
        : actualMargin2x1 >= 15
        ? "bueno"
        : actualMargin2x1 >= 5
        ? "aceptable"
        : actualMargin2x1 >= 0
        ? "bajo"
        : "perdida";

    // Recomendaciones
    const recommendations = [];

    if (profit2x1 < 0) {
      recommendations.push({
        type: "error",
        message: `¡PÉRDIDA! Pierdes $${Math.abs(profit2x1).toFixed(0)} por cada 2x1. El costo total ($${totalCost2x1.toFixed(0)}) es mayor que el precio de venta ($${clientPays.toFixed(0)}).`,
      });
    } else if (actualMargin2x1 < 5) {
      recommendations.push({
        type: "warning",
        message: `Margen muy bajo (${actualMargin2x1.toFixed(1)}%). Apenas cubres costos. Considera elegir un producto regalo más económico.`,
      });
    } else if (actualMargin2x1 < 15) {
      recommendations.push({
        type: "warning",
        message: `El margen de ${actualMargin2x1.toFixed(1)}% es bajo. Considera aumentar el precio del producto principal o elegir un regalo más económico.`,
      });
    }

    if (discountPercentage > 50) {
      recommendations.push({
        type: "info",
        message: `El cliente ahorra ${discountPercentage.toFixed(1)}% vs. comprar ambos por separado. ¡Muy atractivo!`,
      });
    }

    if (actualMargin2x1 >= 25) {
      recommendations.push({
        type: "success",
        message: `Excelente margen (${actualMargin2x1.toFixed(1)}%). Esta promoción es muy rentable.`,
      });
    } else if (actualMargin2x1 >= 15) {
      recommendations.push({
        type: "success",
        message: `Buen margen (${actualMargin2x1.toFixed(1)}%). Promoción rentable y atractiva.`,
      });
    }

    if (isDifferentProducts && giftProduct) {
      recommendations.push({
        type: "info",
        message: `Promoción combinada: Cliente paga ${product.name} y recibe ${giftProduct.name} gratis.`,
      });
    }

    // Respuesta
    return NextResponse.json({
      success: true,
      isDifferentProducts,
      mainProduct: {
        id: product._id,
        name: product.name,
        buyPrice,
        sellPrice,
        stock: product.stock,
      },
      giftProduct: giftProduct ? {
        id: giftProduct._id,
        name: giftProduct.name,
        buyPrice: giftBuyPrice,
        sellPrice: giftSellPrice,
        stock: giftProduct.stock,
      } : null,
      normalMetrics: {
        margin: normalMargin,
        profit: normalProfit,
        revenue: sellPrice,
      },
      promotion2x1: {
        type,
        totalCost: totalCost2x1,
        clientPays: clientPays,
        profit: profit2x1,
        margin: actualMargin2x1,
        marginStatus,
        isRentable,
      },
      comparison: {
        normalRevenue2Units,
        promotionRevenue: clientPays,
        discountAmount,
        discountPercentage,
        clientSavings: discountAmount,
      },
      recommendations,
    });
  } catch (error: any) {
    console.error("Error al calcular promoción:", error);

    if (error.name === "CastError") {
      return NextResponse.json(
        { success: false, error: "ID de producto inválido" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Error al calcular la promoción",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
