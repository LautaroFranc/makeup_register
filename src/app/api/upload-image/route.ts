import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/config/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No se envió el archivo" },
        { status: 400 }
      );
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "La imagen supera los 5MB" },
        { status: 400 }
      );
    }

    // Convertir blob a base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    // Subir a cloudinary
    const uploaded = await cloudinary.uploader.upload(
      `data:${file.type};base64,${base64}`,
      {
        folder: "uploads",
        resource_type: "auto",
      }
    );

    return NextResponse.json(
      {
        success: true,
        url: uploaded.secure_url,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("UPLOAD ERROR:", error);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
