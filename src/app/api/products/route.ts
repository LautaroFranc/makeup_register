import { NextResponse } from "next/server";
import Product from "@/models/Product"; // Asegúrate de que esta ruta sea correcta
import connectDB from "@/config/db"; // Ruta de conexión a la base de datos
import cloudinary from "@/config/cloudinary";

// Conectar a la base de datos antes de manejar cualquier solicitud
connectDB();

// Manejar solicitud GET (Listar productos)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let products;

    if (category) {
      products = await Product.find({ category });
    } else {
      products = await Product.find();
    }

    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Manejar solicitud POST (Crear un nuevo producto)
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const productData: any = {};
    formData.forEach((value, key) => {
      productData[key] = value;
    });

    // Verificar si existe un archivo de imagen
    const imageFile = formData.get("image") as Blob | null;
    let uploadedImage: any = null;

    if (imageFile) {
      // Limitar el tamaño del archivo
      if (imageFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: "Image size exceeds 5 MB" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await imageFile.arrayBuffer());
      if (buffer.length === 0) {
        return NextResponse.json(
          { success: false, error: "File buffer is empty" },
          { status: 400 }
        );
      }

      uploadedImage = await cloudinary.uploader.upload(
        `data:${imageFile.type};base64,${buffer.toString("base64")}`,
        {
          folder: "products",
          resource_type: "auto",
        }
      );
    }

    const newProduct = await Product.create({
      ...productData,
      image: uploadedImage?.secure_url || null,
    });

    return NextResponse.json(
      { success: true, data: newProduct },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Manejar solicitud DELETE (Eliminar un producto por ID)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
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

// Manejar solicitud PUT (Actualizar un producto por ID)
export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const updatedProduct = await Product.findByIdAndUpdate(id, body, {
      new: true,
    });
    if (!updatedProduct) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
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
