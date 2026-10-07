import * as XLSX from "xlsx";

const TEMPLATE_ROW = {
  Nombre: "Labial Mate XYZ",
  Descripción: "Labial de larga duración, buena cobertura",
  Categoría: "Labiales",
  Proveedor: "Distribuidora ABC",
  "URL Producto": "https://proveedor.com/producto",
  "Costo Compra": 2500,
  "Costo Envío": 300,
  "Otros Costos": 100,
  "Costo Testeo": 200,
  "Notas Testeo": "Duración 8hs en prueba real",
  "Precio Venta Sugerido": 5500,
  "Precio Mayorista Sugerido": 4500,
  Estado: "idea",
  Prioridad: "media",
  "Fecha Planeada": "",
  "Notas Generales": "Revisar antes del lanzamiento de verano",
};

export async function exportFutureProductsToExcel(filename = "futuros-productos") {
  const token = localStorage.getItem("token");

  const response = await fetch("/api/future-products", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error("No se pudieron obtener los futuros productos.");

  const data = await response.json();
  const items = data.items ?? [];

  const rows =
    items.length === 0
      ? [TEMPLATE_ROW] // Plantilla de ejemplo si no hay datos
      : items.map((p: any) => ({
          Nombre: p.name,
          Descripción: p.description || "",
          Categoría: p.category || "",
          Proveedor: p.supplier || "",
          "URL Producto": p.productUrl || "",
          "Costo Compra": p.productCost,
          "Costo Envío": p.shippingCost,
          "Otros Costos": p.otherCosts,
          "Costo Testeo": p.testingCost,
          "Notas Testeo": p.testingNotes || "",
          "Precio Venta Sugerido": p.suggestedSellPrice ?? "",
          "Precio Mayorista Sugerido": p.suggestedWholesalePrice ?? "",
          Estado: p.status,
          Prioridad: p.priority,
          "Fecha Planeada": p.plannedDate ? new Date(p.plannedDate).toLocaleDateString("es-AR") : "",
          "Notas Generales": p.notes || "",
        }));

  const ws = XLSX.utils.json_to_sheet(rows);

  ws["!cols"] = [
    { wch: 28 }, // Nombre
    { wch: 35 }, // Descripción
    { wch: 18 }, // Categoría
    { wch: 25 }, // Proveedor
    { wch: 35 }, // URL
    { wch: 14 }, // Costo Compra
    { wch: 14 }, // Costo Envío
    { wch: 14 }, // Otros Costos
    { wch: 14 }, // Costo Testeo
    { wch: 30 }, // Notas Testeo
    { wch: 20 }, // Precio Venta
    { wch: 22 }, // Precio Mayorista
    { wch: 12 }, // Estado
    { wch: 10 }, // Prioridad
    { wch: 15 }, // Fecha
    { wch: 35 }, // Notas
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Futuros Productos");

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`);
}
