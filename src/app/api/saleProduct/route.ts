import { NextRequest, NextResponse } from "next/server";
import SaleProduct from "@/models/SaleProduct";
import Product from "@/models/Product";
import connectDB from "@/config/db";
import { authMiddleware } from "../middleware";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;

    const userId = (await authCheck.json()).user._id;
    const saleProduct = await SaleProduct.find({ user: userId }).sort({
      createdAt: -1,
    });

    return NextResponse.json({
      success: true,
      sales: saleProduct,
      total: saleProduct.length,
    });
  } catch (error: any) {
    console.error("Error al obtener ventas:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener las ventas. Por favor intenta nuevamente.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Manejar solicitud POST (Crear nueva venta de  producto)
export async function POST(req: NextRequest) {
  try {
    // Primero parseamos el body ANTES de cualquier otra cosa
    let body = await req.json();

    // Si body es un string, parsearlo manualmente
    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    // Luego autenticamos
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;

    const authData = await authCheck.json();
    const userId = authData.user._id;

    // Aceptar tanto productId (del frontend) como idProduct (legacy)
    const productId = body.productId || body.idProduct;
    const quantity = body.quantity || body.stock;
    const sellPrice = body.sellPrice;

    // Validar datos requeridos
    if (!productId) {
      return NextResponse.json(
        { success: false, message: "El ID del producto es requerido" },
        { status: 400 }
      );
    }

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { success: false, message: "La cantidad debe ser mayor a 0" },
        { status: 400 }
      );
    }

    // Buscar el producto primero sin filtro de usuario para diagnóstico
    const productExists = await Product.findById(productId);

    if (!productExists) {
      return NextResponse.json(
        {
          success: false,
          message: "Producto no encontrado. Verifica que el ID sea correcto.",
          details: `ID buscado: ${productId}`,
        },
        { status: 404 }
      );
    }

    // Verificar si el producto pertenece al usuario
    if (productExists.user.toString() !== userId.toString()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No tienes permiso para vender este producto. El producto pertenece a otro usuario.",
        },
        { status: 403 }
      );
    }

    const product = productExists;

    // Verificar stock disponible
    if (product.stock < quantity) {
      return NextResponse.json(
        {
          success: false,
          message: `Stock insuficiente. Disponible: ${product.stock}, Solicitado: ${quantity}`,
        },
        { status: 400 }
      );
    }

    // Reducir stock del producto
    product.stock -= quantity;
    await product.save();

    // Crear el registro de la venta con userId
    const newSaleProduct = await SaleProduct.create({
      idProduct: productId,
      stock: quantity,
      sellPrice: sellPrice || product.sellPrice, // Usar precio del producto si no se especifica
      user: userId,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Venta registrada exitosamente",
        sale: newSaleProduct,
        productName: product.name,
        stockRestante: product.stock,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al registrar venta:", error);

    // Manejar error de ID inválido
    if (error.name === "CastError") {
      return NextResponse.json(
        {
          success: false,
          message: "ID de producto inválido. El formato del ID no es correcto.",
        },
        { status: 400 }
      );
    }

    // Manejar errores de validación de Mongoose
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return NextResponse.json(
        {
          success: false,
          message: "Error de validación: " + validationErrors.join(", "),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Error al registrar la venta. Por favor intenta nuevamente.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Manejar solicitud DELETE (Eliminar venta y restaurar stock)
export async function DELETE(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;

    const userId = (await authCheck.json()).user._id;

    // Obtener el ID de la venta desde query params
    const { searchParams } = new URL(req.url);
    const saleId = searchParams.get("id");

    if (!saleId) {
      return NextResponse.json(
        { success: false, message: "El ID de la venta es requerido" },
        { status: 400 }
      );
    }

    // Buscar la venta
    const sale = await SaleProduct.findOne({ _id: saleId, user: userId });

    if (!sale) {
      return NextResponse.json(
        { success: false, message: "Venta no encontrada o no tienes permiso para eliminarla" },
        { status: 404 }
      );
    }

    // Buscar el producto para restaurar el stock
    const product = await Product.findById(sale.idProduct);

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Producto asociado no encontrado. La venta será eliminada pero el stock no se restaurará.",
        },
        { status: 404 }
      );
    }

    // Restaurar el stock (sumar la cantidad vendida)
    const quantitySold = sale.stock;
    product.stock += quantitySold;
    await product.save();

    // Eliminar la venta
    await SaleProduct.findByIdAndDelete(saleId);

    return NextResponse.json({
      success: true,
      message: "Venta eliminada y stock restaurado exitosamente",
      productName: product.name,
      quantityRestored: quantitySold,
      newStock: product.stock,
    });
  } catch (error: any) {
    console.error("Error al eliminar venta:", error);

    if (error.name === "CastError") {
      return NextResponse.json(
        { success: false, message: "ID de venta inválido" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Error al eliminar la venta",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
