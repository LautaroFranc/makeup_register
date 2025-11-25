import { NextRequest, NextResponse } from "next/server";
import SaleProduct from "@/models/SaleProduct";
import Product from "@/models/Product";
import Users from "@/models/Users";
import Store from "@/models/Store";
import connectDB from "@/config/db";

connectDB();

// POST - Registrar venta pública usando el slug de la tienda o del usuario
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { success: false, message: "El slug es requerido" },
        { status: 400 }
      );
    }

    // Intentar buscar primero por slug de tienda
    let store = await Store.findOne({ slug, isActive: true, isPublic: true });
    let userId: string;
    let storeId: string | null = null;

    if (store) {
      // Se encontró tienda, usar su usuario
      userId = store.user.toString();
      storeId = store._id.toString();
    } else {
      // Si no se encuentra tienda, buscar por slug de usuario (retrocompatibilidad)
      const user = await Users.findOne({ slug });
      if (!user) {
        return NextResponse.json(
          { success: false, message: "Tienda o usuario no encontrado" },
          { status: 404 }
        );
      }
      userId = (user._id as any).toString();
    }

    // Parsear el body
    let body = await req.json();

    // Si body es un string, parsearlo manualmente
    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    // Determinar si es un array de productos o un producto único
    const isArrayRequest = Array.isArray(body.products);
    const productsToProcess = isArrayRequest
      ? body.products
      : [
          {
            productId: body.productId || body.idProduct,
            quantity: body.quantity || body.stock,
            sellPrice: body.sellPrice,
          },
        ];

    // Validar que haya productos
    if (!productsToProcess || productsToProcess.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Debe proporcionar al menos un producto para registrar la venta",
        },
        { status: 400 }
      );
    }

    // Arrays para almacenar resultados
    const successfulSales = [];
    const errors = [];
    const productsUpdated = [];

    // Procesar cada producto
    for (const productData of productsToProcess) {
      try {
        const productId = productData.productId || productData.idProduct;
        const quantity = productData.quantity || productData.stock;
        const sellPrice = productData.sellPrice;

        // Validar datos requeridos del producto
        if (!productId) {
          errors.push({
            product: productData,
            error: "El ID del producto es requerido",
          });
          continue;
        }

        if (!quantity || quantity <= 0) {
          errors.push({
            productId,
            error: "La cantidad debe ser mayor a 0",
          });
          continue;
        }

        // Buscar el producto
        const product = await Product.findById(productId);

        if (!product) {
          errors.push({
            productId,
            error: `Producto no encontrado`,
          });
          continue;
        }

        // Verificar si el producto pertenece a la tienda o al usuario
        const productBelongsToStore = storeId
          ? product.store?.toString() === storeId
          : product.user.toString() === userId;

        if (!productBelongsToStore) {
          errors.push({
            productId,
            productName: product.name,
            error: "El producto no pertenece a esta tienda",
            debug: {
              productStore: product.store?.toString(),
              expectedStoreId: storeId,
              productUser: product.user?.toString(),
              expectedUserId: userId,
              lookupMode: storeId ? "store" : "user",
            },
          });
          continue;
        }

        // Verificar que el producto esté publicado (solo productos públicos)
        if (!product.published) {
          errors.push({
            productId,
            productName: product.name,
            error: "Este producto no está disponible para venta pública",
          });
          continue;
        }

        // Verificar stock disponible
        if (product.stock < quantity) {
          errors.push({
            productId,
            productName: product.name,
            error: `Stock insuficiente. Disponible: ${product.stock}, Solicitado: ${quantity}`,
          });
          continue;
        }

        // Reducir stock del producto (usando updateOne para evitar validaciones innecesarias)
        const newStock = product.stock - quantity;
        await Product.updateOne(
          { _id: productId },
          { $set: { stock: newStock } }
        );

        // Crear el registro de la venta
        const newSaleProduct = await SaleProduct.create({
          idProduct: productId,
          stock: quantity,
          sellPrice: sellPrice || product.sellPrice,
          user: userId,
          isPublicSale: true,
        });

        // Agregar a resultados exitosos
        successfulSales.push({
          _id: newSaleProduct._id,
          productId,
          productName: product.name,
          quantity: newSaleProduct.stock,
          sellPrice: newSaleProduct.sellPrice,
          createdAt: newSaleProduct.createdAt,
        });

        productsUpdated.push({
          productId,
          name: product.name,
          stockRestante: newStock,
        });
      } catch (error: any) {
        errors.push({
          productId: productData.productId || productData.idProduct,
          error: error.message || "Error al procesar el producto",
        });
      }
    }

    // Determinar el resultado de la operación
    const partialSuccess = successfulSales.length > 0 && errors.length > 0;
    const allFailed = successfulSales.length === 0;

    if (allFailed) {
      return NextResponse.json(
        {
          success: false,
          message: "No se pudo registrar ninguna venta",
          errors: errors[0],
        },
        { status: 400 }
      );
    }

    if (partialSuccess) {
      return NextResponse.json(
        {
          success: true,
          message: `${successfulSales.length} venta(s) registrada(s), ${errors.length} error(es)`,
          sales: successfulSales,
          products: productsUpdated,
          errors,
        },
        { status: 207 } // Multi-Status
      );
    }

    // Todo exitoso
    return NextResponse.json(
      {
        success: true,
        message: isArrayRequest
          ? `${successfulSales.length} ventas registradas exitosamente`
          : "Venta registrada exitosamente",
        sales: successfulSales,
        products: productsUpdated,
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
