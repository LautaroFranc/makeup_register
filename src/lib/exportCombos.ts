import * as XLSX from "xlsx";

export async function exportCombosToExcel(filename = "combos") {
  const token = localStorage.getItem("token");
  
  const response = await fetch(`/api/combos`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("No se pudieron obtener los combos para exportar.");
  }

  const data = await response.json();
  const combos = data.combos ?? [];

  let rows: any[] = [];

  if (combos.length === 0) {
    // Si no hay combos, generamos una fila de ejemplo (plantilla)
    rows.push({
      "Nombre": "Ejemplo Kit Completo",
      "Descripción": "Un kit de ejemplo para la plantilla",
      "Precio Combo": 5000,
      "Publicado": "Sí",
      "Pre-venta": "No",
      "Ocultar sin stock": "Sí",
      "Productos": "Labial Rojo (1); Base Liquida (2)",
      "Válido Desde": "",
      "Válido Hasta": "",
    });
  } else {
    rows = combos.map((c: any) => {
      // Formatear items: "Nombre (Cantidad); Nombre (Cantidad)"
      const itemsStr = c.items
        .map((i: any) => `${i.productName} (${i.quantity})`)
        .join("; ");

      return {
        "Nombre": c.name,
        "Descripción": c.description || "",
        "Precio Combo": c.comboPrice,
        "Publicado": c.published ? "Sí" : "No",
        "Pre-venta": c.allowOversell ? "Sí" : "No",
        "Ocultar sin stock": c.autoHideWhenOutOfStock ? "Sí" : "No",
        "Productos": itemsStr,
        "Válido Desde": c.startDate ? new Date(c.startDate).toLocaleDateString("es-AR") : "",
        "Válido Hasta": c.endDate ? new Date(c.endDate).toLocaleDateString("es-AR") : "",
      };
    });
  }

  const ws = XLSX.utils.json_to_sheet(rows);

  ws["!cols"] = [
    { wch: 25 }, // Nombre
    { wch: 35 }, // Descripción
    { wch: 15 }, // Precio Combo
    { wch: 10 }, // Publicado
    { wch: 12 }, // Pre-venta
    { wch: 18 }, // Ocultar sin stock
    { wch: 50 }, // Productos
    { wch: 15 }, // Válido Desde
    { wch: 15 }, // Válido Hasta
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Combos");

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`);
}
