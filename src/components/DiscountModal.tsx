"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Loader2, Percent, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatToARS } from "@/lib/utils";

interface Product {
  _id: string;
  name: string;
  description?: string;
  buyPrice: string;
  sellPrice: string;
  stock: number;
  category: string;
  hasDiscount?: boolean;
  discountPercentage?: number;
  discountedPrice?: string;
  discountStartDate?: string;
  discountEndDate?: string;
}

interface DiscountModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({
  product,
  isOpen,
  onClose,
  onRefresh,
}) => {
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [discountStartDate, setDiscountStartDate] = useState("");
  const [discountEndDate, setDiscountEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Cargar datos del producto cuando se abre el modal
  useEffect(() => {
    if (product && isOpen) {
      setHasDiscount(product.hasDiscount || false);
      setDiscountPercentage(product.discountPercentage || 0);

      // Formatear fechas para input type="date"
      const startDate = product.discountStartDate
        ? new Date(product.discountStartDate).toISOString().split('T')[0]
        : "";
      const endDate = product.discountEndDate
        ? new Date(product.discountEndDate).toISOString().split('T')[0]
        : "";

      setDiscountStartDate(startDate);
      setDiscountEndDate(endDate);
    }
  }, [product, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product) return;

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      // Mantener todos los datos originales del producto
      formData.append("name", product.name);
      formData.append("description", product.description || "");
      formData.append("buyPrice", product.buyPrice);
      formData.append("sellPrice", product.sellPrice);
      formData.append("stock", product.stock.toString());
      formData.append("category", product.category);
      formData.append("hasDiscount", hasDiscount.toString());
      formData.append("discountPercentage", discountPercentage.toString());

      if (discountStartDate) {
        formData.append("discountStartDate", discountStartDate);
      }
      if (discountEndDate) {
        formData.append("discountEndDate", discountEndDate);
      }

      const response = await fetch(`/api/products?id=${product._id}`, {
        method: "PUT",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success || response.ok) {
        toast({
          description: "Descuento actualizado exitosamente!",
          variant: "default",
        });

        // Recargar datos
        if (onRefresh) {
          onRefresh();
        }

        onClose();
      } else {
        throw new Error(result.error || "Error al actualizar descuento");
      }
    } catch (error) {
      console.error("Error al actualizar descuento:", error);
      toast({
        description: `Error: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDiscount = async () => {
    if (!product) return;

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      formData.append("name", product.name);
      formData.append("description", product.description || "");
      formData.append("buyPrice", product.buyPrice);
      formData.append("sellPrice", product.sellPrice);
      formData.append("stock", product.stock.toString());
      formData.append("category", product.category);
      formData.append("hasDiscount", "false");
      formData.append("discountPercentage", "0");

      const response = await fetch(`/api/products?id=${product._id}`, {
        method: "PUT",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success || response.ok) {
        toast({
          description: "Descuento eliminado exitosamente!",
          variant: "default",
        });

        setHasDiscount(false);
        setDiscountPercentage(0);
        setDiscountStartDate("");
        setDiscountEndDate("");

        if (onRefresh) {
          onRefresh();
        }

        onClose();
      } else {
        throw new Error(result.error || "Error al eliminar descuento");
      }
    } catch (error) {
      console.error("Error al eliminar descuento:", error);
      toast({
        description: `Error: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  const sellPrice = parseFloat(product.sellPrice);
  const calculatedDiscountedPrice = hasDiscount && discountPercentage > 0
    ? sellPrice * (1 - discountPercentage / 100)
    : sellPrice;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-blue-600" />
            Gestionar Descuento
          </DialogTitle>
          <DialogDescription>
            Configura el descuento para: <strong>{product.name}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Overlay de loading */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              <p className="text-lg font-medium text-gray-700">
                Guardando cambios...
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Precio original */}
          <div className="p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Precio Original:</span>
              <span className="text-xl font-bold text-gray-900">
                {formatToARS(sellPrice)}
              </span>
            </div>
          </div>

          {/* Switch para activar descuento */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <Switch
                id="hasDiscount-modal"
                checked={hasDiscount}
                onCheckedChange={setHasDiscount}
                className="data-[state=checked]:bg-blue-600"
              />
              <Label htmlFor="hasDiscount-modal" className="text-sm font-medium cursor-pointer">
                Activar descuento
              </Label>
            </div>
            {hasDiscount && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveDiscount}
                disabled={loading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Eliminar descuento
              </Button>
            )}
          </div>

          {/* Campos de descuento (solo si está activado) */}
          {hasDiscount && (
            <div className="space-y-4">
              {/* Porcentaje de descuento */}
              <div>
                <Label htmlFor="discountPercentage-modal" className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Porcentaje de Descuento
                </Label>
                <Input
                  id="discountPercentage-modal"
                  type="number"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                  placeholder="Ej: 10"
                  min="0"
                  max="100"
                  step="1"
                  required
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ingresa un valor entre 0 y 100
                </p>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discountStartDate-modal" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Fecha de Inicio
                  </Label>
                  <Input
                    id="discountStartDate-modal"
                    type="date"
                    value={discountStartDate}
                    onChange={(e) => setDiscountStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="discountEndDate-modal" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Fecha de Fin
                  </Label>
                  <Input
                    id="discountEndDate-modal"
                    type="date"
                    value={discountEndDate}
                    onChange={(e) => setDiscountEndDate(e.target.value)}
                    min={discountStartDate}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Vista previa del precio con descuento */}
              {discountPercentage > 0 && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600 mb-2 font-medium">
                    Vista Previa del Precio Final:
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg text-gray-400 line-through">
                        {formatToARS(sellPrice)}
                      </span>
                      <span className="text-3xl font-bold text-blue-600">
                        {formatToARS(calculatedDiscountedPrice)}
                      </span>
                    </div>
                    <span className="px-3 py-1.5 bg-red-500 text-white text-sm font-bold rounded-full shadow-md">
                      -{discountPercentage}% OFF
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Ahorro: {formatToARS(sellPrice - calculatedDiscountedPrice)}
                  </p>
                </div>
              )}

              {/* Información de fechas */}
              {(discountStartDate || discountEndDate) && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-xs text-yellow-800 font-medium">
                    📅 Vigencia del descuento:
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    {discountStartDate && `Desde: ${new Date(discountStartDate).toLocaleDateString('es-AR')}`}
                    {discountStartDate && discountEndDate && " • "}
                    {discountEndDate && `Hasta: ${new Date(discountEndDate).toLocaleDateString('es-AR')}`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || (hasDiscount && discountPercentage <= 0)}
              className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Guardar Descuento
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
