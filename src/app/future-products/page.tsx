"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { exportFutureProductsToExcel } from "@/lib/exportFutureProducts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  PackagePlus,
  Loader2,
  ArrowRight,
  Store,
  Truck,
  Calculator,
  FlaskConical,
  ChevronRight,
  Star,
  Clock,
  CircleCheck,
  CircleX,
  ShoppingCart,
  Download,
  Upload,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Status = "idea" | "planificado" | "pedido" | "en_testeo" | "aprobado" | "descartado";
type Priority = "alta" | "media" | "baja";

interface FutureProduct {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  supplier: string;
  productUrl?: string;
  productCost: number;
  shippingCost: number;
  otherCosts: number;
  totalCost: number;
  testingCost: number;
  testingNotes?: string;
  suggestedSellPrice?: number;
  suggestedWholesalePrice?: number;
  estimatedMargin?: number;
  status: Status;
  priority: Priority;
  notes?: string;
  plannedDate?: string;
  convertedProductId?: string;
  convertedAt?: string;
  createdAt: string;
}

// ─── Config visual por estado ─────────────────────────────────────────────────

const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: React.ReactNode }> = {
  idea: { label: "Idea", color: "bg-gray-100 text-gray-700 border-gray-300", icon: <Star className="h-3 w-3" /> },
  planificado: { label: "Planificado", color: "bg-blue-100 text-blue-700 border-blue-300", icon: <Clock className="h-3 w-3" /> },
  pedido: { label: "Pedido", color: "bg-amber-100 text-amber-700 border-amber-300", icon: <ShoppingCart className="h-3 w-3" /> },
  en_testeo: { label: "En testeo", color: "bg-purple-100 text-purple-700 border-purple-300", icon: <FlaskConical className="h-3 w-3" /> },
  aprobado: { label: "Aprobado", color: "bg-green-100 text-green-700 border-green-300", icon: <CircleCheck className="h-3 w-3" /> },
  descartado: { label: "Descartado", color: "bg-red-100 text-red-700 border-red-300", icon: <CircleX className="h-3 w-3" /> },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; dot: string }> = {
  alta: { label: "Alta", dot: "bg-red-500" },
  media: { label: "Media", dot: "bg-amber-400" },
  baja: { label: "Baja", dot: "bg-gray-400" },
};

const STATUS_ORDER: Status[] = ["idea", "planificado", "pedido", "en_testeo", "aprobado", "descartado"];

// ─── Form vacío ───────────────────────────────────────────────────────────────

const emptyForm = {
  name: "",
  description: "",
  category: "",
  supplier: "",
  productUrl: "",
  productCost: "",
  shippingCost: "",
  otherCosts: "",
  testingCost: "",
  testingNotes: "",
  suggestedSellPrice: "",
  suggestedWholesalePrice: "",
  status: "idea" as Status,
  priority: "media" as Priority,
  notes: "",
  plannedDate: "",
};

// ─── Formateo ─────────────────────────────────────────────────────────────────

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function num(v: string | number | undefined) {
  return parseFloat(String(v || "0").replace(",", ".")) || 0;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function FutureProductsPage() {
  const [items, setItems] = useState<FutureProduct[]>([]);
  const [categories, setCategories] = useState<{name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | Status>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<FutureProduct | null>(null);
  const [convertItem, setConvertItem] = useState<FutureProduct | null>(null);
  const [convertForm, setConvertForm] = useState({ sellPrice: "", buyPrice: "", wholesalePrice: "", stock: "0" });
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchItemsAndCategories = useCallback(async () => {
    setLoading(true);
    try {
      const [resItems, resCats] = await Promise.all([
        fetch("/api/future-products", { headers }),
        fetch("/api/categories/private?includeInactive=true", { headers })
      ]);
      const dataItems = await resItems.json();
      const dataCats = await resCats.json();
      if (dataItems.success) setItems(dataItems.items);
      if (dataCats.categories) setCategories(dataCats.categories);
    } catch {
      toast({ title: "Error al cargar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItemsAndCategories(); }, []);

  // Costos calculados en tiempo real (formulario)
  const totalCost = num(form.productCost) + num(form.shippingCost) + num(form.otherCosts);
  const margin = form.suggestedSellPrice && totalCost > 0
    ? Math.round(((num(form.suggestedSellPrice) - totalCost) / num(form.suggestedSellPrice)) * 100)
    : null;
  const filtered = items.filter(i => {
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    if (filterCategory !== "all" && (i.category || "Sin categoría") !== filterCategory) return false;
    return true;
  });

  // Conteo por estado para el filtro
  const counts = items.reduce<Record<string, number>>((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {});

  // Group by category
  const groupedByCategory = filtered.reduce((acc, item) => {
    const cat = item.category || "Sin categoría";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, FutureProduct[]>);
  const categoryNames = Object.keys(groupedByCategory).sort();

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleExport = async () => {
    try {
      await exportFutureProductsToExcel("futuros-productos");
      toast({ title: "Excel exportado exitosamente" });
    } catch (err: any) {
      toast({ title: "Error al exportar", description: err.message, variant: "destructive" });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("updateExisting", "true");
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("/api/future-products/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Importación exitosa", description: data.message });
        fetchItemsAndCategories();
      } else {
        toast({ title: "Error en importación", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de conexión", variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setIsFormOpen(true);
  };

  const openEdit = (item: FutureProduct) => {
    setEditingId(item._id);
    setDetailItem(null);
    setForm({
      name: item.name,
      description: item.description || "",
      category: item.category || "",
      supplier: item.supplier,
      productUrl: item.productUrl || "",
      productCost: String(item.productCost),
      shippingCost: String(item.shippingCost),
      otherCosts: String(item.otherCosts),
      testingCost: String(item.testingCost),
      testingNotes: item.testingNotes || "",
      suggestedSellPrice: String(item.suggestedSellPrice || ""),
      suggestedWholesalePrice: String(item.suggestedWholesalePrice || ""),
      status: item.status,
      priority: item.priority,
      notes: item.notes || "",
      plannedDate: item.plannedDate ? item.plannedDate.slice(0, 10) : "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingId ? `/api/future-products?id=${editingId}` : "/api/future-products";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          ...form,
          productCost: num(form.productCost),
          shippingCost: num(form.shippingCost),
          otherCosts: num(form.otherCosts),
          testingCost: num(form.testingCost),
          suggestedSellPrice: form.suggestedSellPrice ? num(form.suggestedSellPrice) : undefined,
          suggestedWholesalePrice: form.suggestedWholesalePrice ? num(form.suggestedWholesalePrice) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: editingId ? "Actualizado" : "Creado", description: data.item?.name });
        setIsFormOpen(false);
        fetchItemsAndCategories();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de conexión", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este futuro producto?")) return;
    try {
      await fetch(`/api/future-products?id=${id}`, { method: "DELETE", headers });
      toast({ title: "Eliminado" });
      setDetailItem(null);
      fetchItemsAndCategories();
    } catch {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  };

  const handleStatusChange = async (item: FutureProduct, status: Status) => {
    try {
      await fetch(`/api/future-products?id=${item._id}`, {
        method: "PUT", headers, body: JSON.stringify({ status }),
      });
      fetchItemsAndCategories();
      if (detailItem?._id === item._id) setDetailItem({ ...detailItem, status });
    } catch {}
  };

  const openConvert = (item: FutureProduct) => {
    setConvertItem(item);
    setDetailItem(null);
    setConvertForm({
      sellPrice: String(item.suggestedSellPrice || ""),
      buyPrice: String(item.totalCost || ""),
      wholesalePrice: String(item.suggestedWholesalePrice || ""),
      stock: "0",
    });
  };

  const handleConvert = async () => {
    if (!convertItem) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/future-products/convert?id=${convertItem._id}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sellPrice: num(convertForm.sellPrice),
          buyPrice: num(convertForm.buyPrice),
          wholesalePrice: num(convertForm.wholesalePrice),
          stock: parseInt(convertForm.stock) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "¡Producto creado!", description: data.message });
        setConvertItem(null);
        fetchItemsAndCategories();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de conexión", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3 max-w-6xl mx-auto">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">Futuros Productos</h1>
            <p className="text-xs text-gray-500 hidden sm:block mt-0.5">Pipeline de productos a testear o comprar</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImport}
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing} className="shrink-0">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 sm:mr-2" />}
              <span className="hidden sm:inline">Importar</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="shrink-0">
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Exportar / Plantilla</span>
            </Button>
            <Button onClick={openCreate} size="sm" className="shrink-0">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Agregar</span>
            </Button>
          </div>
        </div>

        {/* Filtro por estado — scrollable en mobile */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 max-w-6xl mx-auto">
          <button
            onClick={() => setFilterStatus("all")}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${filterStatus === "all" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300"}`}
          >
            Todos ({items.length})
          </button>
          {STATUS_ORDER.map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors flex items-center gap-1 ${filterStatus === s ? `${STATUS_CONFIG[s].color} border-current` : "bg-white text-gray-600 border-gray-300"}`}
            >
              {STATUS_CONFIG[s].icon}
              {STATUS_CONFIG[s].label} {counts[s] ? `(${counts[s]})` : ""}
            </button>
          ))}
        </div>

        {/* Filtro por categoría */}
        <div className="flex gap-2 mt-2 overflow-x-auto pb-3 max-w-6xl mx-auto">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px] h-8 text-xs bg-white">
              <SelectValue placeholder="Filtrar por categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {Array.from(new Set(items.map(i => i.category || "Sin categoría"))).sort().map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contenido */}
      <div className="px-4 py-4 sm:px-6 max-w-6xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <PackagePlus className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-700">
              {filterStatus === "all" ? "Sin futuros productos aún" : `No hay items en "${STATUS_CONFIG[filterStatus as Status]?.label}"`}
            </h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">Registrá un producto que quieras testear o comprar</p>
            {filterStatus === "all" && (
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Agregar primero</Button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {categoryNames.map(cat => (
              <div key={cat}>
                <h2 className="text-xl font-bold text-gray-800 mb-4">{cat}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {groupedByCategory[cat].map(item => {
                    const sc = STATUS_CONFIG[item.status];
                    const pc = PRIORITY_CONFIG[item.priority];
                    const isConverted = !!item.convertedProductId;
                    return (
                      <Card
                        key={item._id}
                        className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
                        onClick={() => setDetailItem(item)}
                      >
                        <CardHeader className="pb-2 pt-4 px-4">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-sm font-semibold leading-tight line-clamp-2">{item.name}</CardTitle>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`w-2 h-2 rounded-full ${pc.dot}`} title={`Prioridad: ${pc.label}`} />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge variant="outline" className={`text-[11px] px-2 py-0 flex items-center gap-1 ${sc.color}`}>
                              {sc.icon}{sc.label}
                            </Badge>
                            {isConverted && (
                              <Badge variant="outline" className="text-[11px] px-2 py-0 text-green-700 border-green-300 bg-green-50">
                                <CircleCheck className="h-3 w-3 mr-1" />Convertido
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-2">
                          {item.supplier && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Store className="h-3 w-3 shrink-0" />
                              <span className="truncate">{item.supplier}</span>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-lg p-2 mt-1">
                            <div>
                              <p className="text-[10px] text-gray-400">Costo total</p>
                              <p className="text-sm font-bold text-gray-800">{formatARS(item.totalCost)}</p>
                            </div>
                            {item.suggestedSellPrice ? (
                              <div>
                                <p className="text-[10px] text-gray-400">Venta sugerida</p>
                                <p className="text-sm font-bold text-green-700">{formatARS(item.suggestedSellPrice)}</p>
                              </div>
                            ) : null}
                          </div>
                          {item.estimatedMargin !== undefined && (
                            <p className="text-xs text-purple-700 font-medium">Margen estimado: {item.estimatedMargin}%</p>
                          )}
                          <div className="flex items-center justify-between pt-1">
                            {item.productUrl ? (
                              <a
                                href={item.productUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="h-3 w-3" />
                                Ver producto
                              </a>
                            ) : (
                              <div />
                            )}
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Drawer de detalle (mobile-first) ─── */}
      <Sheet open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <SheetContent side="bottom" className="h-[92vh] overflow-y-auto rounded-t-2xl px-4 pb-8">
          {detailItem && (() => {
            const sc = STATUS_CONFIG[detailItem.status];
            const pc = PRIORITY_CONFIG[detailItem.priority];
            const isConverted = !!detailItem.convertedProductId;
            return (
              <>
                <SheetHeader className="text-left mb-4">
                  <div className="flex items-start justify-between gap-2">
                    <SheetTitle className="text-lg leading-tight pr-2">{detailItem.name}</SheetTitle>
                    <Badge variant="outline" className={`shrink-0 text-[11px] flex items-center gap-1 ${sc.color}`}>
                      {sc.icon}{sc.label}
                    </Badge>
                  </div>
                  {detailItem.description && (
                    <p className="text-sm text-gray-500 mt-1">{detailItem.description}</p>
                  )}
                </SheetHeader>

                {/* Info proveedor */}
                <div className="space-y-3 mb-5">
                  {detailItem.supplier && (
                    <div className="flex items-center gap-2 text-sm">
                      <Store className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700 font-medium">{detailItem.supplier}</span>
                    </div>
                  )}
                  {detailItem.productUrl && (
                    <a
                      href={detailItem.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver producto en tienda
                    </a>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className={`w-2 h-2 rounded-full ${pc.dot}`} />
                    Prioridad {pc.label}
                    {detailItem.category && <> · {detailItem.category}</>}
                    {detailItem.plannedDate && <> · Planeado {new Date(detailItem.plannedDate).toLocaleDateString("es-AR")}</>}
                  </div>
                </div>

                {/* Costos */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Calculator className="h-3.5 w-3.5" /> Costos
                  </h3>
                  <CostRow label="Precio de compra" value={detailItem.productCost} />
                  <CostRow label="Envío" value={detailItem.shippingCost} />
                  <CostRow label="Otros costos" value={detailItem.otherCosts} />
                  <div className="border-t pt-2">
                    <CostRow label="TOTAL COSTO" value={detailItem.totalCost} bold />
                  </div>
                  {detailItem.testingCost > 0 && (
                    <CostRow label="Costo testeo" value={detailItem.testingCost} muted />
                  )}
                </div>

                {/* Precios sugeridos */}
                {(detailItem.suggestedSellPrice || detailItem.suggestedWholesalePrice) && (
                  <div className="bg-green-50 rounded-xl p-4 mb-4 space-y-2">
                    <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
                      Precios sugeridos
                    </h3>
                    {detailItem.suggestedSellPrice && (
                      <CostRow label="Precio venta" value={detailItem.suggestedSellPrice} bold />
                    )}
                    {detailItem.suggestedWholesalePrice && (
                      <CostRow label="Precio mayorista" value={detailItem.suggestedWholesalePrice} />
                    )}
                    {detailItem.estimatedMargin !== undefined && (
                      <p className="text-sm text-purple-700 font-semibold pt-1">
                        Margen estimado: {detailItem.estimatedMargin}%
                      </p>
                    )}
                  </div>
                )}

                {/* Notas testeo */}
                {detailItem.testingNotes && (
                  <div className="bg-purple-50 rounded-xl p-4 mb-4">
                    <h3 className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                      <FlaskConical className="h-3.5 w-3.5" /> Notas de testeo
                    </h3>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{detailItem.testingNotes}</p>
                  </div>
                )}

                {detailItem.notes && (
                  <div className="bg-amber-50 rounded-xl p-4 mb-4">
                    <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">Notas generales</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{detailItem.notes}</p>
                  </div>
                )}

                {/* Cambio de estado rápido */}
                {!isConverted && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Cambiar estado</p>
                    <div className="flex gap-2 flex-wrap">
                      {STATUS_ORDER.filter(s => s !== "aprobado").map(s => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(detailItem, s)}
                          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors flex items-center gap-1 ${detailItem.status === s ? `${STATUS_CONFIG[s].color} border-current` : "bg-white text-gray-500 border-gray-300"}`}
                        >
                          {STATUS_CONFIG[s].icon}
                          {STATUS_CONFIG[s].label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex flex-col gap-2 pt-2">
                  {!isConverted && (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => openConvert(detailItem)}
                    >
                      <PackagePlus className="h-4 w-4 mr-2" />
                      Convertir a producto real
                    </Button>
                  )}
                  {isConverted && (
                    <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                      <CircleCheck className="h-4 w-4 shrink-0" />
                      Ya fue convertido a producto del catálogo
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => openEdit(detailItem)}>
                      <Pencil className="h-4 w-4 mr-2" /> Editar
                    </Button>
                    <Button variant="outline" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(detailItem._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ─── Modal formulario crear / editar ─── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar producto" : "Agregar futuro producto"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-1">
            {/* Básico */}
            <Section title="Información básica">
              <Field label="Nombre *">
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Labial mate XYZ" required />
              </Field>
              <Field label="Descripción">
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Notas sobre el producto..." rows={2} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Categoría">
                  <Input list="category-suggestions" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Labiales" />
                  <datalist id="category-suggestions">
                    {categories.map(c => <option key={c.name} value={c.name} />)}
                  </datalist>
                </Field>
                <Field label="Prioridad">
                  <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v as Priority }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">🔴 Alta</SelectItem>
                      <SelectItem value="media">🟡 Media</SelectItem>
                      <SelectItem value="baja">⚪ Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            {/* Proveedor */}
            <Section title="Proveedor">
              <Field label="Nombre del proveedor *">
                <Input value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))} placeholder="Ej: Distribuidora ABC" required />
              </Field>
              <Field label="URL del producto">
                <Input type="url" value={form.productUrl} onChange={e => setForm(p => ({ ...p, productUrl: e.target.value }))} placeholder="https://..." />
              </Field>
            </Section>

            {/* Costos */}
            <Section title={`Costos de adquisición — Total: ${formatARS(totalCost)}`}>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Compra">
                  <Input type="number" min={0} step="0.01" value={form.productCost} onChange={e => setForm(p => ({ ...p, productCost: e.target.value }))} placeholder="0" />
                </Field>
                <Field label="Envío">
                  <Input type="number" min={0} step="0.01" value={form.shippingCost} onChange={e => setForm(p => ({ ...p, shippingCost: e.target.value }))} placeholder="0" />
                </Field>
                <Field label="Otros">
                  <Input type="number" min={0} step="0.01" value={form.otherCosts} onChange={e => setForm(p => ({ ...p, otherCosts: e.target.value }))} placeholder="0" />
                </Field>
              </div>
            </Section>

            {/* Precios sugeridos */}
            <Section title={margin !== null ? `Precios sugeridos — Margen: ${margin}%` : "Precios sugeridos"}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Precio de venta">
                  <Input type="number" min={0} step="0.01" value={form.suggestedSellPrice} onChange={e => setForm(p => ({ ...p, suggestedSellPrice: e.target.value }))} placeholder="0" />
                </Field>
                <Field label="Precio mayorista">
                  <Input type="number" min={0} step="0.01" value={form.suggestedWholesalePrice} onChange={e => setForm(p => ({ ...p, suggestedWholesalePrice: e.target.value }))} placeholder="0" />
                </Field>
              </div>
            </Section>

            {/* Testeo */}
            <Section title="Testeo y métricas">
              <Field label="Costo de testeo">
                <Input type="number" min={0} step="0.01" value={form.testingCost} onChange={e => setForm(p => ({ ...p, testingCost: e.target.value }))} placeholder="Muestras, publicidad de prueba..." />
              </Field>
              <Field label="Notas de testeo">
                <Textarea value={form.testingNotes} onChange={e => setForm(p => ({ ...p, testingNotes: e.target.value }))} placeholder="Resultados de prueba, feedback de clientes..." rows={2} />
              </Field>
            </Section>

            {/* Estado y planificación */}
            <Section title="Estado y planificación">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Estado">
                  <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as Status }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map(s => (
                        <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Fecha planeada">
                  <Input type="date" value={form.plannedDate} onChange={e => setForm(p => ({ ...p, plannedDate: e.target.value }))} />
                </Field>
              </div>
              <Field label="Notas generales">
                <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Otras anotaciones..." rows={2} />
              </Field>
            </Section>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingId ? "Guardar cambios" : "Agregar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Modal conversión a producto real ─── */}
      <Dialog open={!!convertItem} onOpenChange={(open) => !open && setConvertItem(null)}>
        <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] sm:w-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-green-600" />
              Convertir a producto real
            </DialogTitle>
          </DialogHeader>
          {convertItem && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-green-800">{convertItem.name}</p>
                <p className="text-green-700 text-xs mt-0.5">Costo total calculado: {formatARS(convertItem.totalCost)}</p>
              </div>
              <p className="text-xs text-gray-500">
                El producto se creará <strong>despublicado</strong> para que lo revises antes de mostrarlo en la tienda.
              </p>
              <Field label="Precio de venta *">
                <Input type="number" min={0} step="0.01" value={convertForm.sellPrice} onChange={e => setConvertForm(p => ({ ...p, sellPrice: e.target.value }))} required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Precio de compra">
                  <Input type="number" min={0} step="0.01" value={convertForm.buyPrice} onChange={e => setConvertForm(p => ({ ...p, buyPrice: e.target.value }))} />
                </Field>
                <Field label="Precio mayorista">
                  <Input type="number" min={0} step="0.01" value={convertForm.wholesalePrice} onChange={e => setConvertForm(p => ({ ...p, wholesalePrice: e.target.value }))} />
                </Field>
              </div>
              <Field label="Stock inicial">
                <Input type="number" min={0} value={convertForm.stock} onChange={e => setConvertForm(p => ({ ...p, stock: e.target.value }))} />
              </Field>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setConvertItem(null)}>Cancelar</Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleConvert} disabled={submitting || !convertForm.sellPrice}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                  Crear producto
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-600">{label}</Label>
      {children}
    </div>
  );
}

function CostRow({ label, value, bold, muted }: { label: string; value: number; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between items-center text-sm ${muted ? "text-gray-400" : "text-gray-700"}`}>
      <span className={bold ? "font-semibold" : ""}>{label}</span>
      <span className={bold ? "font-bold text-gray-900" : ""}>{formatARS(value)}</span>
    </div>
  );
}
