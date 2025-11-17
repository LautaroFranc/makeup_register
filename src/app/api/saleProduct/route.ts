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
    const saleProduct = await SaleProduct.find({ user: userId });

    return NextResponse.json(saleProduct);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Manejar solicitud POST (Crear nueva venta de  producto)
export async function POST(req: NextRequest) {
  try {
    // Autenticar usuario
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;

    const userId = (await authCheck.json()).user._id;

    const body = await req.json();
    const { idProduct, stock, sellPrice } = body;

    // Verificar si el producto existe y pertenece al usuario
    const product = await Product.findOne({ _id: idProduct, user: userId });
    if (!product) {
      return NextResponse.json(
        { success: false, message: "Producto no encontrado." },
        { status: 404 }
      );
    }

    if (product.stock < stock) {
      return NextResponse.json(
        {
          success: false,
          message: "Stock insuficiente para realizar la venta.",
        },
        { status: 400 }
      );
    }

    product.stock -= stock;

    await product.save();

    // Crear el registro de la venta con userId
    const newSaleProduct = await SaleProduct.create({
      idProduct,
      stock,
      sellPrice,
      user: userId,
    });

    return NextResponse.json(newSaleProduct, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
