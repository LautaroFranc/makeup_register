import * as XLSX from "xlsx";

interface Product {
  _id: string;
  name: string;
  code: string;
  barcode: string;
  category: string;
  buyPrice: string;
  sellPrice: string;
  wholesalePrice?: string;
  stock: number;
  published: boolean;
  hasDiscount?: boolean;
  discountPercentage?: number;
  discountedPrice?: string;
}

interface FilterState {
  search: string;
  category: string;
  published: string;
  stock: string;
  minPrice?: string;
  maxPrice?: string;
}

/**
 * Descarga TODOS los productos (ignorando paginación) con los filtros activos
 * y genera un archivo .xlsx en el cliente.
 */
export async function exportProductsToExcel(
  filters: FilterState,
  filename = "productos"
): Promise<void> {
  const token = localStorage.getItem("token");

  const searchParams = new URLSearchParams({ page: "1", limit: "9999" });

  if (filters.search) searchParams.set("search", filters.search);
  if (filters.category !== "all") searchParams.set("category", filters.category);
  if (filters.published !== "all") searchParams.set("published", filters.published);
  if (filters.stock !== "all") searchParams.set("stock", filters.stock);
  if (filters.minPrice) searchParams.set("minPrice", filters.minPrice);
  if (filters.maxPrice) searchParams.set("maxPrice", filters.maxPrice);

  const response = await fetch(`/api/products/private?${searchParams}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("No se pudieron obtener los productos para exportar.");
  }

  const data = await response.json();
  const products: Product[] = data.products ?? [];

  const rows = products.map((p) => ({
    Código: p.code,
    Código_de_barras: p.barcode,
    Nombre: p.name,
    Categoría: p.category,
    "Precio compra": parseFloat(p.buyPrice),
    "Precio venta": parseFloat(p.sellPrice),
    "Precio mayorista": p.wholesalePrice ? parseFloat(p.wholesalePrice) : "",
    Stock: p.stock,
    Publicado: p.published ? "Sí" : "No",
    "Tiene descuento": p.hasDiscount ? "Sí" : "No",
    "% Descuento": p.hasDiscount ? p.discountPercentage ?? "" : "",
    "Precio c/descuento": p.discountedPrice ? parseFloat(p.discountedPrice) : "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Ancho de columnas
  ws["!cols"] = [
    { wch: 12 },  // Código
    { wch: 16 },  // Barcode
    { wch: 30 },  // Nombre
    { wch: 20 },  // Categoría
    { wch: 14 },  // Precio compra
    { wch: 14 },  // Precio venta
    { wch: 16 },  // Precio mayorista
    { wch: 8 },   // Stock
    { wch: 10 },  // Publicado
    { wch: 14 },  // Tiene descuento
    { wch: 12 },  // % Descuento
    { wch: 16 },  // Precio c/descuento
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Productos");

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`);
}
