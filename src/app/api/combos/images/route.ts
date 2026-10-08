import { NextRequest, NextResponse } from "next/server";
import Combo from "@/models/Combo";
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
    const comboId = formData.get("productId") as string; // Reutilizamos productId para compatibilidad con ImageModal

    if (!comboId) {
      return NextResponse.json(
        { success: false, error: "Combo ID requerido" },
        { status: 400 }
      );
    }

    // Verificar que el combo pertenece al usuario
    const combo = await Combo.findById(comboId);
    if (!combo || String(combo.user) !== String(userId)) {
      return NextResponse.json(
        { success: false, error: "Combo no encontrado" },
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
            { success: false, error: "El tamaño de la imagen excede 5 MB" },
            { status: 400 }
          );
        }

        const buffer = Buffer.from(await imgFile.arrayBuffer());
        const uploadedImg = await cloudinary.uploader.upload(
          `data:${imgFile.type};base64,${buffer.toString("base64")}`,
          { folder: "combos", resource_type: "auto" }
        );
        uploadedImages.push(uploadedImg.secure_url);
      }
    }

    // Actualizar el combo con las nuevas imágenes
    const updatedCombo = await Combo.findByIdAndUpdate(
      comboId,
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
      { success: true, data: updatedCombo },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
