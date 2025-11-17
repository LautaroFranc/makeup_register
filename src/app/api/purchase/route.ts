import { NextRequest, NextResponse } from "next/server";
import SaleProduct from "@/models/SaleProduct";
import Product from "@/models/Product";
import { authMiddleware } from "../middleware";

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date();
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck; // Verifica autenticación

    const userId = (await authCheck.json()).user._id; // Extraer ID del usuario autenticado
    const sales = await SaleProduct.find({
      user: userId,
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

    // Mapear los datos de las ventas con las imágenes del producto
    const result = await Promise.all(
      sales.map(async (sale: any) => {
        const product = await Product.findOne({
          _id: sale.idProduct,
          user: userId,
        });

        // Combinar todas las imágenes disponibles del producto
        const allImages = [];
        if (product?.image) {
          allImages.push(product.image);
        }
        if (product?.images && product.images.length > 0) {
          allImages.push(...product.images);
        }

        return {
          idProduct: sale.idProduct,
          image: allImages.length > 0 ? allImages[0] : "/placeholder.jpg", // Imagen principal
          images: allImages, // Todas las imágenes
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
