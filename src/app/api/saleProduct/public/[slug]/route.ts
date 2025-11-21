import { NextRequest, NextResponse } from "next/server";
import SaleProduct from "@/models/SaleProduct";
import Product from "@/models/Product";
import Users from "@/models/Users";
import connectDB from "@/config/db";

connectDB();

// POST - Registrar venta pública usando el slug del usuario
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { success: false, message: "El slug del usuario es requerido" },
        { status: 400 }
      );
    }

    // Buscar el usuario por slug
    const user = await Users.findOne({ slug });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const userId = user._id as string;

    // Parsear el body
    let body = await req.json();

    // Si body es un string, parsearlo manualmente
    if (typeof body === "string") {
      body = JSON.parse(body);
    }

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

    // Buscar el producto
    const product = await Product.findById(productId);

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Producto no encontrado. Verifica que el ID sea correcto.",
          details: `ID buscado: ${productId}`,
        },
        { status: 404 }
      );
    }

    // Verificar si el producto pertenece al usuario del slug
    if (product.user.toString() !== userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El producto no pertenece a este usuario. Verifica el slug y el ID del producto.",
        },
        { status: 403 }
      );
    }

    // Verificar que el producto esté publicado (solo productos públicos)
    if (!product.published) {
      return NextResponse.json(
        {
          success: false,
          message: "Este producto no está disponible para venta pública",
        },
        { status: 403 }
      );
    }

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

    // Crear el registro de la venta
    const newSaleProduct = await SaleProduct.create({
      idProduct: productId,
      stock: quantity,
      sellPrice: sellPrice || product.sellPrice, // Usar precio del producto si no se especifica
      user: userId,
      isPublicSale: true, // Marcar como venta pública
    });

    return NextResponse.json(
      {
        success: true,
        message: "Venta registrada exitosamente",
        sale: {
          _id: newSaleProduct._id,
          quantity: newSaleProduct.stock,
          sellPrice: newSaleProduct.sellPrice,
          createdAt: newSaleProduct.createdAt,
        },
        product: {
          name: product.name,
          stockRestante: product.stock,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al registrar venta pública:", error);

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
