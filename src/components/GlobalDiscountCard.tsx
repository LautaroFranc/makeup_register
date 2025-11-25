"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Percent,
  Calendar,
  Save,
  Trash2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GlobalDiscountCardProps {
  onUpdate?: () => void;
}

export const GlobalDiscountCard: React.FC<GlobalDiscountCardProps> = ({
  onUpdate,
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState(10);
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [globalDiscountId, setGlobalDiscountId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadGlobalDiscount();
  }, []);

  const loadGlobalDiscount = async () => {
    try {
      setLoadingData(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/global-discount", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success && data.globalDiscount) {
        const discount = data.globalDiscount;
        setHasDiscount(true);
        setGlobalDiscountId(discount._id);
        setName(discount.name);
        setDescription(discount.description || "");
        setDiscountPercentage(discount.discountPercentage);
        setIsActive(discount.isActive);

        // Formatear fechas
        if (discount.startDate) {
          setStartDate(new Date(discount.startDate).toISOString().split("T")[0]);
        }
        if (discount.endDate) {
          setEndDate(new Date(discount.endDate).toISOString().split("T")[0]);
        }
      }
    } catch (error) {
      console.error("Error al cargar descuento global:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del descuento es requerido",
        variant: "destructive",
      });
      return;
    }

    if (discountPercentage < 0 || discountPercentage > 100) {
      toast({
        title: "Error",
        description: "El descuento debe estar entre 0 y 100%",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/global-discount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description,
          discountPercentage,
          isActive,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setHasDiscount(true);
        setGlobalDiscountId(data.globalDiscount._id);
        toast({
          title: "Éxito",
          description: "Descuento global guardado exitosamente",
        });
        if (onUpdate) onUpdate();
      } else {
        throw new Error(data.error || "Error al guardar");
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar el descuento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de eliminar el descuento global?")) return;

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/global-discount", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setHasDiscount(false);
        setGlobalDiscountId(null);
        setName("");
        setDescription("");
        setDiscountPercentage(10);
        setIsActive(true);
        setStartDate("");
        setEndDate("");

        toast({
          title: "Éxito",
          description: "Descuento global eliminado exitosamente",
        });
        if (onUpdate) onUpdate();
      } else {
        throw new Error(data.error || "Error al eliminar");
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar el descuento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-2 border-blue-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Descuento Global</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Aplica un descuento a todos tus productos
              </p>
            </div>
          </div>
          {hasDiscount && (
            <div className="flex items-center gap-2">
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                className="data-[state=checked]:bg-green-600"
              />
              <span className="text-sm font-medium">
                {isActive ? "Activo" : "Inactivo"}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Alerta informativa */}
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">¿Cómo funciona?</p>
            <p>
              Este descuento se aplicará automáticamente a todos los productos de tu tienda.
              Los descuentos individuales de productos tienen prioridad sobre este descuento global.
            </p>
          </div>
        </div>

        {/* Formulario */}
        <div className="space-y-4">
          {/* Nombre */}
          <div>
            <Label htmlFor="name">Nombre del Descuento</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Descuento de Temporada"
              className="mt-1"
            />
          </div>

          {/* Descripción */}
          <div>
            <Label htmlFor="description">Descripción (Opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Descuento especial para el mes de enero"
              rows={2}
              className="mt-1"
            />
          </div>

          {/* Porcentaje de descuento */}
          <div>
            <Label htmlFor="percentage" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Porcentaje de Descuento
            </Label>
            <div className="flex items-center gap-4 mt-1">
              <Input
                id="percentage"
                type="number"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                min="0"
                max="100"
                step="1"
                className="max-w-[120px]"
              />
              <span className="text-2xl font-bold text-blue-600">
                {discountPercentage}% OFF
              </span>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de Inicio
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de Fin (Opcional)
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        {discountPercentage > 0 && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-600 mb-2 font-medium">
              Vista Previa del Descuento:
            </p>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Ejemplo: Producto de $100.00</p>
                <div className="flex items-center gap-3">
                  <span className="text-lg text-gray-400 line-through">$100.00</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${(100 * (1 - discountPercentage / 100)).toFixed(2)}
                  </span>
                </div>
              </div>
              <span className="px-4 py-2 bg-red-500 text-white text-lg font-bold rounded-full shadow-md">
                -{discountPercentage}% OFF
              </span>
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Guardando..." : hasDiscount ? "Actualizar Descuento" : "Crear Descuento"}
          </Button>
          {hasDiscount && (
            <Button
              onClick={handleDelete}
              disabled={loading}
              variant="destructive"
              className="px-6"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
