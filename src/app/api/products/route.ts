import { NextRequest, NextResponse } from "next/server";
import Product from "@/models/Product"; // Asegúrate de que esta ruta sea correcta
import connectDB from "@/config/db"; // Ruta de conexión a la base de datos
import cloudinary from "@/config/cloudinary";
import { authMiddleware } from "../middleware";
import Users from "@/models/Users";

// Conectar a la base de datos antes de manejar cualquier solicitud
connectDB();

async function generateUniqueProductCode(prefix = "P") {
  const lastProduct = await Product.findOne().sort({ createdAt: -1 });
  const lastCode = lastProduct?.code || `${prefix}99`;
  const lastNumber = parseInt(lastCode.replace(prefix, "")) || 99;
  return `${prefix}${lastNumber + 1}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Slug requerido" },
        { status: 400 }
      );
    }

    const user = await Users.findOne({ slug });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const products = await Product.find({ user: user._id });

    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const userId = (await authCheck.json()).user._id; // Extraer usuario autenticado
    const formData = await req.formData();
    const productData: any = {};

    formData.forEach((value, key) => {
      productData[key] = value;
    });

    const imageFile = formData.get("image") as Blob | null;
    let uploadedImage: any = null;

    if (imageFile) {
      if (imageFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: "Image size exceeds 5 MB" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await imageFile.arrayBuffer());
      uploadedImage = await cloudinary.uploader.upload(
        `data:${imageFile.type};base64,${buffer.toString("base64")}`,
        { folder: "products", resource_type: "auto" }
      );
    }

    const newProductCode = await generateUniqueProductCode();

    const newProduct = await Product.create({
      ...productData,
      image: uploadedImage?.secure_url || null,
      code: newProductCode,
      user: userId,
    });

    return NextResponse.json(
      { success: true, data: newProduct },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;

    const userId = (await authCheck.json()).user._id;
    console.log(userId);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    const deletedProduct = await Product.findOneAndDelete({
      _id: id,
      user: userId,
    });

    if (!deletedProduct) {
      return NextResponse.json(
        { success: false, error: "Product not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: deletedProduct });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;

    const userId = (await authCheck.json()).user._id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: id, user: userId },
      body,
      { new: true }
    );

    if (!updatedProduct) {
      return NextResponse.json(
        { success: false, error: "Product not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedProduct);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
