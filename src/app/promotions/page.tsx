"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tag,
  Calendar,
  Trash2,
  Plus,
  TrendingUp,
  Calculator,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatToARS } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Promotion {
  _id: string;
  name: string;
  type: string;
  specialPrice: number;
  margin: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  product: {
    _id: string;
    name: string;
    buyPrice: string;
    sellPrice: string;
  };
  productName?: string;
  productBuyPrice?: number;
  productSellPrice?: number;
  giftProduct?: {
    _id: string;
    name: string;
    buyPrice: string;
    sellPrice: string;
  };
  giftProductName?: string;
  giftProductBuyPrice?: number;
  giftProductSellPrice?: number;
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/promotions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setPromotions(data.promotions);
      }
    } catch (error) {
      console.error("Error al cargar promociones:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las promociones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (promotionId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/promotions?id=${promotionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isActive: !currentStatus,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPromotions((prev) =>
          prev.map((p) =>
            p._id === promotionId ? { ...p, isActive: !currentStatus } : p
          )
        );
        toast({
          title: currentStatus ? "Promoción desactivada" : "Promoción activada",
          description: "El estado se actualizó exitosamente",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al actualizar",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (promotionId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta promoción?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/promotions?id=${promotionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setPromotions((prev) => prev.filter((p) => p._id !== promotionId));
        toast({
          title: "Promoción eliminada",
          description: "La promoción se eliminó exitosamente",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al eliminar",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getProductPrice = (promotion: Promotion) => {
    if (promotion.product) {
      return parseFloat(promotion.product.sellPrice);
    }
    return promotion.productSellPrice || 0;
  };

  const getGiftProductPrice = (promotion: Promotion) => {
    if (promotion.giftProduct) {
      return parseFloat(promotion.giftProduct.sellPrice);
    }
    return promotion.giftProductSellPrice || 0;
  };

  const getNormalPrice = (promotion: Promotion) => {
    const mainPrice = getProductPrice(promotion);
    // Si hay producto regalo, es productos diferentes
    if (promotion.giftProduct || promotion.giftProductName) {
      const giftPrice = getGiftProductPrice(promotion);
      return mainPrice + giftPrice;
    }
    // Si no, es 2x1 del mismo producto
    return mainPrice * 2;
  };

  const isDifferentProducts = (promotion: Promotion) => {
    return !!(promotion.giftProduct || promotion.giftProductName);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="h-8 w-8 text-blue-600" />
            Promociones
          </h1>
          <p className="text-gray-600 mt-2">
            Gestiona tus promociones 2x1 y ofertas especiales
          </p>
        </div>
        <Button
          onClick={() => router.push("/promotions/calculator")}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Calculator className="h-4 w-4 mr-2" />
          Nueva Promoción
        </Button>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Promociones</p>
                <p className="text-2xl font-bold text-gray-900">
                  {promotions.length}
                </p>
              </div>
              <Tag className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activas</p>
                <p className="text-2xl font-bold text-green-600">
                  {promotions.filter((p) => p.isActive).length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactivas</p>
                <p className="text-2xl font-bold text-gray-500">
                  {promotions.filter((p) => !p.isActive).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de promociones */}
      <Card>
        <CardHeader>
          <CardTitle>Todas las Promociones</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500 py-8">Cargando...</p>
          ) : promotions.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No hay promociones creadas</p>
              <Button
                onClick={() => router.push("/promotions/calculator")}
                variant="outline"
              >
                Crear Primera Promoción
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto Principal</TableHead>
                  <TableHead>Regalo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Precio 2x1</TableHead>
                  <TableHead>Precio Normal</TableHead>
                  <TableHead>Margen</TableHead>
                  <TableHead>Fecha Inicio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promotion) => (
                  <TableRow key={promotion._id}>
                    <TableCell className="font-medium">
                      {promotion.product?.name || promotion.productName || "N/A"}
                    </TableCell>
                    <TableCell>
                      {isDifferentProducts(promotion) ? (
                        <span className="text-sm text-gray-700">
                          {promotion.giftProduct?.name || promotion.giftProductName || "N/A"}
                        </span>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Mismo producto
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          isDifferentProducts(promotion)
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }
                      >
                        {promotion.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-blue-600">
                      {formatToARS(promotion.specialPrice)}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatToARS(getNormalPrice(promotion))}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          promotion.margin >= 25
                            ? "bg-green-100 text-green-700"
                            : promotion.margin >= 15
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {promotion.margin.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(promotion.startDate)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={promotion.isActive}
                          onCheckedChange={() =>
                            handleToggleActive(promotion._id, promotion.isActive)
                          }
                          className="data-[state=checked]:bg-green-600"
                        />
                        <span className="text-xs text-gray-500">
                          {promotion.isActive ? "Activa" : "Inactiva"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(promotion._id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
