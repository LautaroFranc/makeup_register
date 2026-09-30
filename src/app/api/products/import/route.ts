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
  costo: "buyPrice",
  "precio venta": "sellPrice",
  "precio de venta": "sellPrice",
  sellprice: "sellPrice",
  precio: "sellPrice",
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

    // updateExisting: si "true" actualiza productos existentes, si "false" los omite
    const updateExisting = formData.get("updateExisting") === "true";

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

    // Obtener productos existentes: mapa nombre.toLowerCase() → producto
    const existingProductsList = await Product.find({ user: userId }).select("name _id code barcode");
    const existingMap = new Map(
      existingProductsList.map((p) => [p.name.toLowerCase().trim(), p])
    );

    const errors: { row: number; message: string }[] = [];
    const skipped: { row: number; name: string; reason: string }[] = [];
    const toCreate: any[] = [];
    const toUpdate: { filter: any; data: any; name: string }[] = [];

    // Rastrear nombres procesados en este Excel para evitar duplicados internos
    const processedNames = new Set<string>();

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
        errors.push({ row: rowNum, message: `Fila ${rowNum}: El nombre del producto es requerido` });
        continue;
      }

      // Evitar duplicados dentro del mismo Excel
      if (processedNames.has(name.toLowerCase())) {
        skipped.push({ row: rowNum, name, reason: "Nombre duplicado en el mismo archivo" });
        continue;
      }
      processedNames.add(name.toLowerCase());

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

      const wholesalePrice =
        parseFloat(String(row.wholesalePrice || "0").replace(",", ".")) || 0;

      const publishedRaw = String(row.published || "").toLowerCase().trim();
      const published =
        publishedRaw === "" ||
        publishedRaw === "si" ||
        publishedRaw === "sí" ||
        publishedRaw === "true" ||
        publishedRaw === "1" ||
        publishedRaw === "yes";

      const productData = {
        name,
        description: String(row.description || "").trim(),
        category,
        buyPrice: String(buyPrice),
        sellPrice: String(sellPrice),
        wholesalePrice: String(wholesalePrice),
        stock,
        published,
        user: userId,
        store: store._id.toString(),
      };

      const existing = existingMap.get(name.toLowerCase());

      if (existing) {
        if (updateExisting) {
          toUpdate.push({
            filter: { _id: existing._id, user: userId },
            data: productData,
            name,
          });
        } else {
          skipped.push({ row: rowNum, name, reason: "Ya existe un producto con este nombre" });
        }
      } else {
        toCreate.push(productData);
      }
    }

    // ── Crear nuevos productos ─────────────────────────────────────────
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
          attributes: {},
          hasDiscount: false,
          discountPercentage: 0,
          discountedPrice: productData.sellPrice,
        });
        created++;
      } catch (err: any) {
        if (err.code === 11000) {
          // Reintentar con nuevo barcode
          try {
            const code = await generateUniqueProductCode();
            const barcode = generateArgentineBarcode("EAN13");
            await Product.create({
              ...productData,
              code,
              barcode,
              image: null,
              images: [],
              attributes: {},
              hasDiscount: false,
              discountPercentage: 0,
              discountedPrice: productData.sellPrice,
            });
            created++;
          } catch {
            createErrors.push({ name: productData.name, message: "Error al crear (barcode duplicado)" });
          }
        } else {
          createErrors.push({ name: productData.name, message: err.message });
        }
      }
    }

    // ── Actualizar productos existentes ───────────────────────────────
    let updated = 0;
    const updateErrors: { name: string; message: string }[] = [];

    for (const { filter, data, name } of toUpdate) {
      try {
        await Product.findOneAndUpdate(
          filter,
          {
            $set: {
              description: data.description,
              category: data.category,
              buyPrice: data.buyPrice,
              sellPrice: data.sellPrice,
              wholesalePrice: data.wholesalePrice,
              stock: data.stock,
              published: data.published,
            },
          },
          { runValidators: true }
        );
        updated++;
      } catch (err: any) {
        updateErrors.push({ name, message: err.message });
      }
    }

    const totalErrors =
      errors.length + createErrors.length + updateErrors.length;

    const messageParts: string[] = [];
    if (created > 0) messageParts.push(`${created} creado(s)`);
    if (updated > 0) messageParts.push(`${updated} actualizado(s)`);
    if (skipped.length > 0) messageParts.push(`${skipped.length} omitido(s)`);
    if (totalErrors > 0) messageParts.push(`${totalErrors} con error`);

    return NextResponse.json({
      success: true,
      summary: {
        total: rawRows.length,
        created,
        updated,
        skipped: skipped.length,
        errors: totalErrors,
      },
      skipped,
      errors: [
        ...errors,
        ...createErrors.map((e) => ({ row: -1, message: `${e.name}: ${e.message}` })),
        ...updateErrors.map((e) => ({ row: -1, message: `${e.name}: ${e.message}` })),
      ],
      message: `Importación completada: ${messageParts.join(", ")}.`,
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
