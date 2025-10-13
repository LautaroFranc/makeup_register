import { NextRequest, NextResponse } from "next/server";
import Product from "@/models/Product"; // Asegúrate de que esta ruta sea correcta
import connectDB from "@/config/db"; // Ruta de conexión a la base de datos
import cloudinary from "@/config/cloudinary";
import { authMiddleware } from "../middleware";
import Store from "@/models/Store";
import Users from "@/models/Users";
import { generateArgentineBarcode } from "@/lib/barcodeUtils";

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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50); // Máximo 50 productos
    const skip = (page - 1) * limit;

    // Filtros
    const category = searchParams.get("category");
    const published = searchParams.get("published");
    const stockFilter = searchParams.get("stock"); // "in-stock", "low-stock", "out-of-stock"
    const search = searchParams.get("search");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

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

    // Construir filtros de consulta
    const query: any = {
      user: user._id,
    };

    // Filtro de categoría
    if (category && category !== "all") {
      query.category = category;
    }

    // Filtro de stock
    if (stockFilter) {
      switch (stockFilter) {
        case "in-stock":
          query.stock = { $gt: 0 };
          break;
        case "low-stock":
          query.stock = { $gt: 0, $lte: 5 };
          break;
        case "out-of-stock":
          query.stock = 0;
          break;
      }
    }

    // Filtro de búsqueda
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    // Filtro por rango de precios (sellPrice es string)
    const priceFilters: any[] = [];
    if (minPrice) {
      priceFilters.push({
        $expr: { $gte: [{ $toDouble: "$sellPrice" }, parseFloat(minPrice)] },
      });
    }
    if (maxPrice) {
      priceFilters.push({
        $expr: { $lte: [{ $toDouble: "$sellPrice" }, parseFloat(maxPrice)] },
      });
    }
    if (priceFilters.length) {
      query.$and = [...(query.$and || []), ...priceFilters];
    }

    // Obtener productos con filtros y paginación
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(
        "name description image images sellPrice category barcode stock published"
      ); // Incluir stock y published para filtros

    // Contar total de productos con filtros para calcular páginas
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    // Obtener categorías disponibles para este usuario (para filtros)
    const availableCategories = await Product.distinct("category", {
      user: user._id,
      published: true,
    });

    return NextResponse.json({
      success: true,
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit,
      },
      filters: {
        availableCategories,
        appliedFilters: {
          category,
          published,
          stock: stockFilter,
          search,
          minPrice,
          maxPrice,
        },
      },
    });
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

    // Procesar múltiples imágenes
    const multipleImages = formData.getAll("images") as Blob[];
    const uploadedMultipleImages: string[] = [];

    for (const imgFile of multipleImages) {
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
        uploadedMultipleImages.push(uploadedImg.secure_url);
      }
    }

    // Procesar atributos dinámicos
    const attributes = JSON.parse(productData.attributes || "{}");

    const newProductCode = await generateUniqueProductCode();
    const barcode = generateArgentineBarcode("EAN13");

    // Resolver tienda destino
    let targetStoreId = (productData.storeId || productData.store) as
      | string
      | undefined;

    if (targetStoreId) {
      // Validar que la tienda pertenezca al usuario
      const store = await Store.findOne({ _id: targetStoreId, user: userId });
      if (!store) {
        return NextResponse.json(
          {
            success: false,
            error: "La tienda especificada no existe o no pertenece al usuario",
          },
          { status: 400 }
        );
      }
    } else {
      // Tomar la primera tienda activa del usuario
      const store = await Store.findOne({ user: userId, isActive: true });
      if (!store) {
        return NextResponse.json(
          {
            success: false,
            error: "No se encontró una tienda activa para el usuario",
          },
          { status: 400 }
        );
      }
      targetStoreId = store._id.toString();
    }

    const newProduct = await Product.create({
      ...productData,
      image: uploadedImage?.secure_url || null,
      images: uploadedMultipleImages,
      attributes: attributes,
      code: newProductCode,
      barcode: barcode,
      user: userId,
      store: targetStoreId,
      stock: productData.stock ? parseInt(productData.stock as string) : 0,
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

    // Procesar FormData
    const formData = await req.formData();
    const productData: any = {};
    formData.forEach((value, key) => {
      productData[key] = value;
    });

    // Procesar imagen principal si la hay
    const mainImageFile = formData.get("image") as Blob;
    let uploadedMainImageUrl: string | null = null;

    if (mainImageFile && mainImageFile.size > 0) {
      if (mainImageFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: "Main image size exceeds 5 MB" },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await mainImageFile.arrayBuffer());
      const uploadedImg = await cloudinary.uploader.upload(
        `data:${mainImageFile.type};base64,${buffer.toString("base64")}`,
        { folder: "products", resource_type: "auto" }
      );
      uploadedMainImageUrl = uploadedImg.secure_url;
    }

    // Procesar nuevas imágenes si las hay
    const newImages = formData.getAll("images") as Blob[];
    const uploadedNewImageUrls: string[] = [];

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
        uploadedNewImageUrls.push(uploadedImg.secure_url);
      }
    }

    // Obtener el producto actual para manejar las imágenes correctamente
    const currentProduct = await Product.findById(id);
    if (!currentProduct) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Manejar imágenes: remover las eliminadas y agregar las nuevas
    let updatedImages = [...(currentProduct.images || [])];

    // Remover imágenes eliminadas
    const removedImages = JSON.parse(productData.removedImages || "[]");
    if (removedImages.length > 0) {
      updatedImages = updatedImages.filter(
        (img) => !removedImages.includes(img)
      );
    }

    // Agregar nuevas imágenes
    if (uploadedNewImageUrls.length > 0) {
      updatedImages = [...updatedImages, ...uploadedNewImageUrls];
    }

    // Preparar los campos a actualizar
    const updateFields: any = {
      name: productData.name,
      description: productData.description,
      buyPrice: productData.buyPrice,
      sellPrice: productData.sellPrice,
      stock: parseInt(productData.stock),
      category: productData.category,
      attributes: JSON.parse(productData.attributes || "{}"),
      images: updatedImages,
      published:
        productData.published === "true" || productData.published === true,
    };

    // Agregar imagen principal si se subió una nueva
    if (uploadedMainImageUrl) {
      updateFields.image = uploadedMainImageUrl;
    }

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: id, user: userId },
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return NextResponse.json(
        { success: false, error: "Product not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedProduct });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
