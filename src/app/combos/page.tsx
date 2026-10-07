"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { exportCombosToExcel } from "@/lib/exportCombos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatToARS } from "@/lib/utils";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Tag,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Download,
  Upload,
} from "lucide-react";

interface ComboItem {
  product: string;
  productName: string;
  quantity: number;
  unitSellPrice: number;
  currentStock?: number;
}

interface Combo {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  items: ComboItem[];
  totalNormalPrice: number;
  comboPrice: number;
  savings: number;
  published: boolean;
  isActive: boolean;
  isAvailable: boolean;
  allowOversell: boolean;
  autoHideWhenOutOfStock: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

interface ProductOption {
  _id: string;
  name: string;
  sellPrice: string;
  stock: number;
  category: string;
}

interface FormItem {
  productId: string;
  productName: string;
  quantity: number;
  unitSellPrice: number;
}

const emptyForm = {
  name: "",
  description: "",
  comboPrice: "",
  published: true,
  allowOversell: false,
  autoHideWhenOutOfStock: true,
  startDate: "",
  endDate: "",
  items: [] as FormItem[],
};

export default function CombosPage() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [productSearch, setProductSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchCombos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/combos", { headers });
      const data = await res.json();
      if (data.success) setCombos(data.combos);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los combos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products/private?limit=999", { headers });
      const data = await res.json();
      if (data.products) setProducts(data.products);
    } catch {}
  }, []);

  useEffect(() => {
    fetchCombos();
    fetchProducts();
  }, []);

  const totalNormal = form.items.reduce(
    (acc, i) => acc + i.unitSellPrice * i.quantity,
    0
  );
  const savings = totalNormal - parseFloat(form.comboPrice || "0");
  const savingsPct =
    totalNormal > 0 ? Math.round((savings / totalNormal) * 100) : 0;

  const addItemToForm = (product: ProductOption) => {
    if (form.items.some((i) => i.productId === product._id)) return;
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: product._id,
          productName: product.name,
          quantity: 1,
          unitSellPrice: parseFloat(product.sellPrice) || 0,
        },
      ],
    }));
    setProductSearch("");
  };

  const removeItem = (productId: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.productId !== productId),
    }));
  };

  const updateItemQty = (productId: string, qty: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.max(1, qty) } : i
      ),
    }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setIsDialogOpen(true);
  };

  const openEdit = (combo: Combo) => {
    setEditingId(combo._id);
    setForm({
      name: combo.name,
      description: combo.description || "",
      comboPrice: String(combo.comboPrice),
      published: combo.published,
      allowOversell: combo.allowOversell,
      autoHideWhenOutOfStock: combo.autoHideWhenOutOfStock,
      startDate: combo.startDate ? combo.startDate.slice(0, 10) : "",
      endDate: combo.endDate ? combo.endDate.slice(0, 10) : "",
      items: combo.items.map((i) => ({
        productId: i.product,
        productName: i.productName,
        quantity: i.quantity,
        unitSellPrice: i.unitSellPrice,
      })),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.items.length < 2) {
      toast({ title: "Error", description: "El combo necesita al menos 2 productos", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const url = editingId ? `/api/combos?id=${editingId}` : "/api/combos";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          ...form,
          comboPrice: parseFloat(form.comboPrice) || 0,
          items: form.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: editingId ? "Combo actualizado" : "Combo creado", description: data.combo?.name });
        setIsDialogOpen(false);
        fetchCombos();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el combo "${name}"?`)) return;
    try {
      const res = await fetch(`/api/combos?id=${id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Combo eliminado" });
        fetchCombos();
      }
    } catch {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  };

  const handleToggle = async (combo: Combo, field: "published" | "isActive" | "allowOversell" | "autoHideWhenOutOfStock") => {
    try {
      const res = await fetch(`/api/combos?id=${combo._id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ [field]: !combo[field] }),
      });
      const data = await res.json();
      if (data.success) fetchCombos();
    } catch {}
  };

  const handleExport = async () => {
    try {
      await exportCombosToExcel("combos");
      toast({ title: "Excel exportado exitosamente" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
      const res = await fetch("/api/combos/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        toast({
          title: "Importación exitosa",
          description: data.message,
        });
        fetchCombos();
      } else {
        toast({ title: "Error en importación", description: data.error || data.details, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error de conexión", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
      !form.items.some((i) => i.productId === p._id)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Combos y Kits</h1>
          <p className="text-sm text-gray-500 mt-1">
            Agrupá productos en paquetes con precio especial
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".xlsx, .xls"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImport}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Importar
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar / Plantilla
          </Button>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Crear Combo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : combos.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700">No hay combos aún</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Creá tu primer combo agrupando productos a un precio especial
            </p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Crear primer combo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {combos.map((combo) => (
            <Card
              key={combo._id}
              className={`relative overflow-hidden transition-all ${
                !combo.isActive ? "opacity-60" : ""
              }`}
            >
              {/* Banda de estado */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${
                  combo.isAvailable
                    ? "bg-green-500"
                    : combo.allowOversell
                    ? "bg-amber-400"
                    : "bg-red-400"
                }`}
              />

              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{combo.name}</CardTitle>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => openEdit(combo)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(combo._id, combo.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Badges de estado */}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {combo.isAvailable ? (
                    <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-[11px]">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Con stock
                    </Badge>
                  ) : combo.allowOversell ? (
                    <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[11px]">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Pre-venta
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50 text-[11px]">
                      <XCircle className="h-3 w-3 mr-1" /> Sin stock
                    </Badge>
                  )}
                  {!combo.published && (
                    <Badge variant="secondary" className="text-[11px]">Oculto</Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Productos del combo */}
                <div className="space-y-1">
                  {combo.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-gray-600">
                      <span className="truncate">
                        <span className="font-medium">{item.quantity}x</span> {item.productName}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span>{formatToARS(item.unitSellPrice * item.quantity)}</span>
                        {item.currentStock !== undefined && item.currentStock < item.quantity && (
                          <span title={`Stock: ${item.currentStock}`}>
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Precios */}
                <div className="bg-gray-50 rounded-lg p-2.5 space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Precio normal</span>
                    <span className="line-through">{formatToARS(combo.totalNormalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-green-700">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" /> Precio combo
                    </span>
                    <span>{formatToARS(combo.comboPrice)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-purple-700">
                    <span>Ahorro del cliente</span>
                    <span>-{formatToARS(combo.savings)} ({Math.round((combo.savings / combo.totalNormalPrice) * 100)}%)</span>
                  </div>
                </div>

                {/* Controles */}
                <div className="space-y-2 border-t pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-600 flex items-center gap-1">
                      {combo.published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {combo.published ? "Publicado" : "Oculto"}
                    </Label>
                    <Switch
                      checked={combo.published}
                      onCheckedChange={() => handleToggle(combo, "published")}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      Pre-venta sin stock
                    </Label>
                    <Switch
                      checked={combo.allowOversell}
                      onCheckedChange={() => handleToggle(combo, "allowOversell")}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-600">
                      Ocultar si falta stock
                    </Label>
                    <Switch
                      checked={combo.autoHideWhenOutOfStock}
                      onCheckedChange={() => handleToggle(combo, "autoHideWhenOutOfStock")}
                      className="scale-75"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal crear / editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Combo" : "Crear Combo"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nombre y descripción */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <Label htmlFor="combo-name">Nombre del Combo *</Label>
                <Input
                  id="combo-name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ej: Kit Labios Perfectos"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="combo-desc">Descripción</Label>
                <Textarea
                  id="combo-desc"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Describí qué incluye el combo..."
                  rows={2}
                />
              </div>
            </div>

            {/* Buscador de productos */}
            <div className="space-y-2">
              <Label>Productos del combo (mínimo 2) *</Label>
              <Input
                placeholder="Buscar y agregar producto..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              {productSearch && filteredProducts.length > 0 && (
                <div className="border rounded-md max-h-40 overflow-y-auto divide-y">
                  {filteredProducts.slice(0, 8).map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex justify-between items-center"
                      onClick={() => addItemToForm(p)}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-gray-500 text-xs">{formatToARS(parseFloat(p.sellPrice))} — stock {p.stock}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Items seleccionados */}
              {form.items.length > 0 && (
                <div className="border rounded-md divide-y">
                  {form.items.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between px-3 py-2 gap-3">
                      <span className="text-sm font-medium flex-1 truncate">{item.productName}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-500">{formatToARS(item.unitSellPrice)}</span>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItemQty(item.productId, parseInt(e.target.value) || 1)}
                          className="w-16 h-7 text-xs text-center"
                        />
                        <span className="text-xs text-gray-500">= {formatToARS(item.unitSellPrice * item.quantity)}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-400"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Precio del combo */}
            <div className="space-y-2">
              <Label htmlFor="combo-price">Precio del Combo *</Label>
              {totalNormal > 0 && (
                <p className="text-xs text-gray-500">
                  Precio normal: <span className="font-medium">{formatToARS(totalNormal)}</span>
                  {savings > 0 && (
                    <span className="text-green-600 ml-2">
                      → el cliente ahorra {formatToARS(savings)} ({savingsPct}%)
                    </span>
                  )}
                </p>
              )}
              <Input
                id="combo-price"
                type="number"
                min={0}
                step="0.01"
                value={form.comboPrice}
                onChange={(e) => setForm((p) => ({ ...p, comboPrice: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>

            {/* Fechas de vigencia */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="combo-start">Válido desde (opcional)</Label>
                <Input
                  id="combo-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="combo-end">Válido hasta (opcional)</Label>
                <Input
                  id="combo-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3 border rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Publicar en tienda</Label>
                  <p className="text-xs text-gray-500">Los clientes pueden ver este combo</p>
                </div>
                <Switch
                  checked={form.published}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, published: v }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    Permitir pre-venta sin stock
                  </Label>
                  <p className="text-xs text-gray-500">
                    El cliente puede comprar aunque falte stock. Stock puede quedar negativo como señal de reposición pendiente.
                  </p>
                </div>
                <Switch
                  checked={form.allowOversell}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, allowOversell: v }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Ocultar si falta stock</Label>
                  <p className="text-xs text-gray-500">
                    Se oculta automáticamente en la tienda si algún componente se queda sin stock
                    (ignorado si pre-venta está activa)
                  </p>
                </div>
                <Switch
                  checked={form.autoHideWhenOutOfStock}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, autoHideWhenOutOfStock: v }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Guardando...</>
                ) : editingId ? (
                  "Guardar cambios"
                ) : (
                  "Crear Combo"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
