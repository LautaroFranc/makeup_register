import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import Product from "@/models/Product";
import connectDB from "@/config/db";
import { authMiddleware } from "../../middleware";
import Store from "@/models/Store";
import { generateArgentineBarcode } from "@/lib/barcodeUtils";

connectDB();

// Campos esperados en el Excel (case-insensitive)
const COLUMN_MAP: Record<string, string> = {
  nombre: "name",
  name: "name",
  descripcion: "description",
  descripción: "description",
  description: "description",
  categoria: "category",
  categoría: "category",
  category: "category",
  "precio compra": "buyPrice",
  "precio de compra": "buyPrice",
  buyprice: "buyPrice",
  "costo": "buyPrice",
  "precio venta": "sellPrice",
  "precio de venta": "sellPrice",
  sellprice: "sellPrice",
  "precio": "sellPrice",
  "precio mayorista": "wholesalePrice",
  wholesaleprice: "wholesalePrice",
  stock: "stock",
  publicado: "published",
  published: "published",
};

function normalizeKey(key: string): string {
  return key.toLowerCase().trim();
}

async function generateUniqueProductCode(prefix = "P") {
  const lastProduct = await Product.findOne().sort({ createdAt: -1 });
  const lastCode = lastProduct?.code || `${prefix}99`;
  const lastNumber = parseInt(lastCode.replace(prefix, "")) || 99;
  return `${prefix}${lastNumber + 1}`;
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const userId = (await authCheck.json()).user._id;

    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No se recibió ningún archivo" },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const fileName = (file as any).name as string | undefined;
    if (fileName && !fileName.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json(
        { success: false, error: "Solo se aceptan archivos Excel (.xlsx, .xls)" },
        { status: 400 }
      );
    }

    // Parsear el archivo Excel
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
    });

    if (rawRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "El archivo Excel está vacío" },
        { status: 400 }
      );
    }

    // Obtener la tienda activa del usuario
    const store = await Store.findOne({ user: userId, isActive: true });
    if (!store) {
      return NextResponse.json(
        { success: false, error: "No se encontró una tienda activa para el usuario" },
        { status: 400 }
      );
    }

    // Obtener nombres de productos existentes para detectar duplicados
    const existingProducts = await Product.find({ user: userId }).select("name");
    const existingNames = new Set(
      existingProducts.map((p) => p.name.toLowerCase().trim())
    );

    const errors: { row: number; message: string }[] = [];
    const skipped: { row: number; name: string; reason: string }[] = [];
    const toCreate: any[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const rawRow = rawRows[i];
      const rowNum = i + 2; // +2 porque la fila 1 es el encabezado

      // Normalizar claves de columna
      const row: Record<string, any> = {};
      for (const [key, value] of Object.entries(rawRow)) {
        const normalizedKey = normalizeKey(key);
        const mappedKey = COLUMN_MAP[normalizedKey];
        if (mappedKey) {
          row[mappedKey] = value;
        }
      }

      // Validar campos requeridos
      const name = String(row.name || "").trim();
      if (!name) {
        errors.push({ row: rowNum, message: "El nombre del producto es requerido" });
        continue;
      }

      const category = String(row.category || "").trim();
      if (!category) {
        errors.push({ row: rowNum, message: `Fila ${rowNum} (${name}): La categoría es requerida` });
        continue;
      }

      const buyPrice = parseFloat(String(row.buyPrice || "0").replace(",", "."));
      const sellPrice = parseFloat(String(row.sellPrice || "0").replace(",", "."));
      const stock = parseInt(String(row.stock || "0")) || 0;

      if (isNaN(buyPrice) || buyPrice < 0) {
        errors.push({ row: rowNum, message: `Fila ${rowNum} (${name}): Precio de compra inválido` });
        continue;
      }

      if (isNaN(sellPrice) || sellPrice < 0) {
        errors.push({ row: rowNum, message: `Fila ${rowNum} (${name}): Precio de venta inválido` });
        continue;
      }

      // Verificar duplicado
      if (existingNames.has(name.toLowerCase())) {
        skipped.push({ row: rowNum, name, reason: "Ya existe un producto con este nombre" });
        continue;
      }

      // Marcar nombre como ya registrado (por si hay duplicados en el mismo Excel)
      existingNames.add(name.toLowerCase());

      const wholesalePrice = parseFloat(
        String(row.wholesalePrice || "0").replace(",", ".")
      ) || 0;

      const publishedRaw = String(row.published || "").toLowerCase().trim();
      const published =
        publishedRaw === "" ||
        publishedRaw === "si" ||
        publishedRaw === "sí" ||
        publishedRaw === "true" ||
        publishedRaw === "1" ||
        publishedRaw === "yes";

      toCreate.push({
        name,
        description: String(row.description || "").trim(),
        category,
        buyPrice: String(buyPrice),
        sellPrice: String(sellPrice),
        wholesalePrice: String(wholesalePrice),
        stock,
        published,
        attributes: {},
        user: userId,
        store: store._id.toString(),
      });
    }

    // Crear productos en batch
    let created = 0;
    const createErrors: { name: string; message: string }[] = [];

    for (const productData of toCreate) {
      try {
        const code = await generateUniqueProductCode();
        const barcode = generateArgentineBarcode("EAN13");
        await Product.create({
          ...productData,
          code,
          barcode,
          image: null,
          images: [],
          hasDiscount: false,
          discountPercentage: 0,
          discountedPrice: productData.sellPrice,
        });
        created++;
      } catch (err: any) {
        createErrors.push({
          name: productData.name,
          message: err.code === 11000
            ? "Código de barras duplicado, se regenerará"
            : err.message,
        });
        // Reintentar con nuevo barcode si es duplicado de barcode
        if (err.code === 11000) {
          try {
            const code = await generateUniqueProductCode();
            const barcode = generateArgentineBarcode("EAN13");
            await Product.create({ ...productData, code, barcode, image: null, images: [], hasDiscount: false, discountPercentage: 0, discountedPrice: productData.sellPrice });
            created++;
            createErrors.pop(); // Remover el error si el reintento fue exitoso
          } catch {
            // Si falla de nuevo, dejar el error
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: rawRows.length,
        created,
        skipped: skipped.length,
        errors: errors.length + createErrors.length,
      },
      skipped,
      errors: [
        ...errors,
        ...createErrors.map((e) => ({ row: -1, message: `${e.name}: ${e.message}` })),
      ],
      message: `Importación completada: ${created} producto(s) creado(s)${skipped.length > 0 ? `, ${skipped.length} omitido(s) por duplicado` : ""}${errors.length > 0 ? `, ${errors.length} con errores` : ""}`,
    });
  } catch (error: any) {
    console.error("Error al importar productos:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al procesar el archivo. Asegurate de que sea un Excel válido.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
