import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import FutureProduct from "@/models/FutureProduct";
import Category from "@/models/Category";
import Store from "@/models/Store";
import connectDB from "@/config/db";
import { authMiddleware } from "../../middleware";

connectDB();

type Status = "idea" | "planificado" | "pedido" | "en_testeo" | "aprobado" | "descartado";
type Priority = "alta" | "media" | "baja";

const VALID_STATUSES: Status[] = ["idea", "planificado", "pedido", "en_testeo", "aprobado", "descartado"];
const VALID_PRIORITIES: Priority[] = ["alta", "media", "baja"];

const COLUMN_MAP: Record<string, string> = {
  nombre: "name",
  name: "name",
  descripcion: "description",
  descripción: "description",
  description: "description",
  categoría: "category",
  categoria: "category",
  category: "category",
  proveedor: "supplier",
  supplier: "supplier",
  "url producto": "productUrl",
  "url del producto": "productUrl",
  url: "productUrl",
  producturl: "productUrl",
  "costo compra": "productCost",
  "costo de compra": "productCost",
  productcost: "productCost",
  "costo envío": "shippingCost",
  "costo envio": "shippingCost",
  shippingcost: "shippingCost",
  "otros costos": "otherCosts",
  othercosts: "otherCosts",
  "costo testeo": "testingCost",
  testingcost: "testingCost",
  "notas testeo": "testingNotes",
  testingnotes: "testingNotes",
  "precio venta sugerido": "suggestedSellPrice",
  suggestedsellprice: "suggestedSellPrice",
  "precio mayorista sugerido": "suggestedWholesalePrice",
  suggestedwholesaleprice: "suggestedWholesalePrice",
  estado: "status",
  status: "status",
  prioridad: "priority",
  priority: "priority",
  "fecha planeada": "plannedDate",
  planneddate: "plannedDate",
  "notas generales": "notes",
  notas: "notes",
  notes: "notes",
};

function normalizeKey(key: string) {
  return key.toLowerCase().trim().replace(/\s+/g, " ");
}

function parseNum(val: any) {
  return parseFloat(String(val || "0").replace(",", ".")) || 0;
}

function parseDate(val: any): Date | undefined {
  if (!val) return undefined;
  if (typeof val === "number") {
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  const str = String(val).trim();
  const parts = str.split("/");
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? undefined : d;
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id: userId } = (await authCheck.json()).user;

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
      return NextResponse.json({ success: false, error: "Tienda no encontrada" }, { status: 400 });
    }

    // Mapa de existentes por nombre (case-insensitive)
    const existingList = await FutureProduct.find({ user: userId }).select("name _id");
    const existingMap = new Map(existingList.map(p => [p.name.toLowerCase().trim(), p]));

    // Categorías existentes
    const existingCategories = await Category.find({ user: userId, store: store._id }).select("name");
    const existingCategorySet = new Set(existingCategories.map(c => c.name.toLowerCase().trim()));

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
        const mapped = COLUMN_MAP[normalizeKey(key)];
        if (mapped) row[mapped] = value;
      }

      const name = String(row.name || "").trim();
      if (!name) {
        errors.push({ row: rowNum, message: "El nombre es requerido" });
        continue;
      }

      if (processedNames.has(name.toLowerCase())) {
        skipped.push({ row: rowNum, name, reason: "Nombre duplicado en el archivo" });
        continue;
      }
      processedNames.add(name.toLowerCase());

      // Validar status y priority
      const rawStatus = String(row.status || "idea").toLowerCase().trim();
      const status: Status = VALID_STATUSES.includes(rawStatus as Status) ? (rawStatus as Status) : "idea";

      const rawPriority = String(row.priority || "media").toLowerCase().trim();
      const priority: Priority = VALID_PRIORITIES.includes(rawPriority as Priority) ? (rawPriority as Priority) : "media";

      const productCost = parseNum(row.productCost);
      const shippingCost = parseNum(row.shippingCost);
      const otherCosts = parseNum(row.otherCosts);
      const testingCost = parseNum(row.testingCost);
      const totalCost = productCost + shippingCost + otherCosts;

      const suggestedSellPrice = row.suggestedSellPrice ? parseNum(row.suggestedSellPrice) : undefined;
      const suggestedWholesalePrice = row.suggestedWholesalePrice ? parseNum(row.suggestedWholesalePrice) : undefined;
      const estimatedMargin =
        suggestedSellPrice && totalCost > 0
          ? Math.round(((suggestedSellPrice - totalCost) / suggestedSellPrice) * 100)
          : undefined;

      const categoryName = String(row.category || "").trim();

      const itemData = {
        name,
        description: String(row.description || "").trim() || undefined,
        category: categoryName || undefined,
        supplier: String(row.supplier || "").trim(),
        productUrl: String(row.productUrl || "").trim() || undefined,
        productCost,
        shippingCost,
        otherCosts,
        totalCost,
        testingCost,
        testingNotes: String(row.testingNotes || "").trim() || undefined,
        suggestedSellPrice,
        suggestedWholesalePrice,
        estimatedMargin,
        status,
        priority,
        plannedDate: parseDate(row.plannedDate),
        notes: String(row.notes || "").trim() || undefined,
        user: userId,
        store: store._id,
      };

      if (categoryName && !existingCategorySet.has(categoryName.toLowerCase())) {
        try {
          await Category.create({
            name: categoryName,
            user: userId,
            store: store._id,
            isActive: true,
            productCount: 0,
            orden: 0,
          });
          existingCategorySet.add(categoryName.toLowerCase());
        } catch (e) {
          console.error(`Error al crear categoría ${categoryName}:`, e);
        }
      }

      const existing = existingMap.get(name.toLowerCase());

      if (existing) {
        if (updateExisting) {
          try {
            await FutureProduct.findByIdAndUpdate(existing._id, { $set: itemData });
            updated++;
          } catch (e: any) {
            errors.push({ row: rowNum, message: `Error al actualizar "${name}": ${e.message}` });
          }
        } else {
          skipped.push({ row: rowNum, name, reason: "Ya existe un futuro producto con este nombre" });
        }
      } else {
        try {
          await FutureProduct.create(itemData);
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
      message: `Completado: ${created} creados, ${updated} actualizados, ${skipped.length} omitidos, ${errors.length} errores.`,
    });
  } catch (error: any) {
    console.error("Error importando futuros productos:", error);
    return NextResponse.json({ success: false, error: "Error procesando el Excel." }, { status: 500 });
  }
}
