import { NextApiRequest, NextApiResponse } from "next";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import SaleProduct from "@/models/SaleProduct";
import Product from "@/models/Product"; // Asegúrate de tener este modelo

type SaleResponse = {
  idProduct: string;
  image: string;
  totalPrice: number;
  totalStockSold: number;
}[];

export async function GET() {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date();
    // Buscar ventas dentro del mes en curso
    const sales = await SaleProduct.find({
      createdAt: {
        $gte: firstDayOfMonth,
        $lte: today,
      },
    });

    if (!sales.length) {
      return NextResponse.json(
        { success: false, error: { message: "No sales found this month" } },
        { status: 404 }
      );
    }

    // Mapear los datos de las ventas con la imagen del producto
    const result = await Promise.all(
      sales.map(async (sale) => {
        const product = await Product.findOne({ _id: sale.idProduct });
        return {
          idProduct: sale.idProduct,
          image: product?.image || "/placeholder.jpg",
          name: product?.name,
          totalPrice: Number(sale.sellPrice) * sale.stock,
          totalStockSold: sale.stock,
          createdAt: sale.createdAt,
        };
      })
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
