import { NextResponse } from "next/server";
import SaleProduct from "@/models/SaleProduct";
import Product from "@/models/Product";
import connectDB from "@/config/db";

connectDB();

export async function GET(request: Request) {
  try {

    let saleProduct: any = [];

      saleProduct = await SaleProduct.find();
    

    return NextResponse.json(saleProduct);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Manejar solicitud POST (Crear nueva venta de  producto)
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { idProduct, stock, ...rest } = body;

    // Verificar si el producto existe
    const product = await Product.findById(idProduct);
    if (!product) {
      return NextResponse.json(
        { success: false, message: "Producto no encontrado." },
        { status: 404 }
      );
    }

    // Verificar si hay suficiente stock disponible
    if (product.stock < stock) {
      return NextResponse.json(
        {
          success: false,
          message: "Stock insuficiente para realizar la venta.",
        },
        { status: 400 }
      );
    }

    // Restar el stock del producto
    product.stock -= stock;
    await product.save();

    // Crear el registro de la venta
    const newSaleProduct = await SaleProduct.create({
      idProduct,
      stock,
      ...rest,
    });

    return NextResponse.json(newSaleProduct, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
