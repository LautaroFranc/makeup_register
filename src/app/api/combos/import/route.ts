import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import Combo from "@/models/Combo";
import Product from "@/models/Product";
import connectDB from "@/config/db";
import { authMiddleware } from "../../middleware";
import Store from "@/models/Store";

connectDB();

const COLUMN_MAP: Record<string, string> = {
  nombre: "name",
  name: "name",
  descripcion: "description",
  descripción: "description",
  description: "description",
  "precio combo": "comboPrice",
  preciocombo: "comboPrice",
  publicado: "published",
  published: "published",
  "pre-venta": "allowOversell",
  preventa: "allowOversell",
  "ocultar sin stock": "autoHideWhenOutOfStock",
  productos: "items",
  items: "items",
  "válido desde": "startDate",
  "valido desde": "startDate",
  "válido hasta": "endDate",
  "valido hasta": "endDate",
};

function normalizeKey(key: string): string {
  return key.toLowerCase().trim();
}

function parseBoolean(val: any, defaultVal: boolean): boolean {
  const str = String(val || "").toLowerCase().trim();
  if (str === "") return defaultVal;
  return ["si", "sí", "true", "1", "yes"].includes(str);
}

function parseDate(val: any): Date | undefined {
  if (!val) return undefined;
  // Intenta parsear fecha de Excel (número) o string DD/MM/YYYY o ISO
  if (typeof val === "number") {
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  const str = String(val).trim();
  // Simple check for DD/MM/YYYY
  const parts = str.split("/");
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
  }
  const date = new Date(str);
  return isNaN(date.getTime()) ? undefined : date;
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const userId = (await authCheck.json()).user._id;

    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;
    const updateExisting = formData.get("updateExisting") === "true";

    if (!file) {
      return NextResponse.json({ success: false, error: "No se recibió archivo" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    if (rawRows.length === 0) {
      return NextResponse.json({ success: false, error: "El archivo está vacío" }, { status: 400 });
    }

    const store = await Store.findOne({ user: userId, isActive: true });
    if (!store) {
      return NextResponse.json({ success: false, error: "No se encontró tienda activa" }, { status: 400 });
    }

    // Cache de todos los productos del usuario para mapear por nombre exacto (case-insensitive)
    const existingProductsList = await Product.find({ user: userId }).select("name _id sellPrice");
    const productsMap = new Map(
      existingProductsList.map((p) => [p.name.toLowerCase().trim(), p])
    );

    // Combos existentes
    const existingCombosList = await Combo.find({ user: userId }).select("name _id totalNormalPrice");
    const combosMap = new Map(
      existingCombosList.map((c) => [c.name.toLowerCase().trim(), c])
    );

    const errors: { row: number; message: string }[] = [];
    const skipped: { row: number; name: string; reason: string }[] = [];
    let created = 0;
    let updated = 0;

    const processedNames = new Set<string>();

    for (let i = 0; i < rawRows.length; i++) {
      const rawRow = rawRows[i];
      const rowNum = i + 2;
      const row: Record<string, any> = {};

      for (const [key, value] of Object.entries(rawRow)) {
        const mappedKey = COLUMN_MAP[normalizeKey(key)];
        if (mappedKey) row[mappedKey] = value;
      }

      const name = String(row.name || "").trim();
      if (!name) {
        errors.push({ row: rowNum, message: "El nombre es requerido" });
        continue;
      }

      if (processedNames.has(name.toLowerCase())) {
        skipped.push({ row: rowNum, name, reason: "Duplicado en el archivo" });
        continue;
      }
      processedNames.add(name.toLowerCase());

      const comboPrice = parseFloat(String(row.comboPrice || "0").replace(",", "."));
      if (isNaN(comboPrice) || comboPrice < 0) {
        errors.push({ row: rowNum, message: `Precio combo inválido en "${name}"` });
        continue;
      }

      // Parsear items: "Labial Rojo (1); Base Liquida (2)"
      const itemsRaw = String(row.items || "").trim();
      if (!itemsRaw) {
        errors.push({ row: rowNum, message: `No hay productos definidos en "${name}"` });
        continue;
      }

      const itemStrings = itemsRaw.split(";").map((s) => s.trim()).filter(Boolean);
      if (itemStrings.length < 2) {
        errors.push({ row: rowNum, message: `Se requieren al menos 2 productos en "${name}"` });
        continue;
      }

      const builtItems = [];
      let totalNormalPrice = 0;
      let hasItemError = false;

      for (const itemStr of itemStrings) {
        // match: "Nombre del producto (3)" o solo "Nombre del producto"
        const match = itemStr.match(/^(.*?)(?:\s*\((\d+)\))?$/);
        if (!match) {
          errors.push({ row: rowNum, message: `Formato de producto inválido en "${name}": ${itemStr}` });
          hasItemError = true;
          break;
        }

        const prodName = match[1].trim();
        const qty = match[2] ? parseInt(match[2]) : 1;

        const product = productsMap.get(prodName.toLowerCase());
        if (!product) {
          errors.push({ row: rowNum, message: `Producto no encontrado en el sistema: "${prodName}"` });
          hasItemError = true;
          break;
        }

        const unitPrice = parseFloat(product.sellPrice) || 0;
        totalNormalPrice += unitPrice * qty;
        
        builtItems.push({
          product: product._id,
          productName: product.name,
          quantity: qty,
          unitSellPrice: unitPrice,
        });
      }

      if (hasItemError) continue;

      const comboData = {
        name,
        description: String(row.description || "").trim(),
        items: builtItems,
        totalNormalPrice,
        comboPrice,
        savings: totalNormalPrice - comboPrice,
        published: parseBoolean(row.published, true),
        allowOversell: parseBoolean(row.allowOversell, false),
        autoHideWhenOutOfStock: parseBoolean(row.autoHideWhenOutOfStock, true),
        startDate: parseDate(row.startDate),
        endDate: parseDate(row.endDate),
        user: userId,
        store: store._id,
        isActive: true,
      };

      const existing = combosMap.get(name.toLowerCase());

      if (existing) {
        if (updateExisting) {
          try {
            await Combo.findByIdAndUpdate(existing._id, { $set: comboData });
            updated++;
          } catch (e: any) {
            errors.push({ row: rowNum, message: `Error al actualizar "${name}": ${e.message}` });
          }
        } else {
          skipped.push({ row: rowNum, name, reason: "Ya existe un combo con este nombre" });
        }
      } else {
        try {
          await Combo.create(comboData);
          created++;
        } catch (e: any) {
          errors.push({ row: rowNum, message: `Error al crear "${name}": ${e.message}` });
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: { total: rawRows.length, created, updated, skipped: skipped.length, errors: errors.length },
      skipped,
      errors,
      message: `Proceso completado: ${created} creados, ${updated} actualizados, ${errors.length} errores.`,
    });
  } catch (error: any) {
    console.error("Error importando combos:", error);
    return NextResponse.json({ success: false, error: "Error procesando el Excel." }, { status: 500 });
  }
}
