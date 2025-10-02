import { NextRequest, NextResponse } from "next/server";
import Product from "@/models/Product";
import connectDB from "@/config/db";
import cloudinary from "@/config/cloudinary";
import { authMiddleware } from "../../middleware";

// Conectar a la base de datos
connectDB();

export async function PUT(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const userId = (await authCheck.json()).user._id;

    const formData = await req.formData();
    const productId = formData.get("productId") as string;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID requerido" },
        { status: 400 }
      );
    }

    // Verificar que el producto pertenece al usuario
    const product = await Product.findById(productId);
    if (!product || product.user !== userId) {
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // Procesar nuevas imágenes
    const newImages = formData.getAll("images") as Blob[];
    const uploadedImages: string[] = [];

    for (const imgFile of newImages) {
      if (imgFile && imgFile.size > 0) {
        if (imgFile.size > 5 * 1024 * 1024) {
          return NextResponse.json(
            { success: false, error: "Image size exceeds 5 MB" },
            { status: 400 }
          );
        }

        const buffer = Buffer.from(await imgFile.arrayBuffer());
        const uploadedImg = await cloudinary.uploader.upload(
          `data:${imgFile.type};base64,${buffer.toString("base64")}`,
          { folder: "products", resource_type: "auto" }
        );
        uploadedImages.push(uploadedImg.secure_url);
      }
    }

    // Actualizar el producto con las nuevas imágenes
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        $push: {
          images: {
            $each: uploadedImages,
          },
        },
      },
      { new: true }
    );

    return NextResponse.json(
      { success: true, data: updatedProduct },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
