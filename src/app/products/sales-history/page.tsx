"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { History, Trash2, Package, TrendingUp, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatToARS } from "@/lib/utils";

interface Sale {
  _id: string;
  idProduct: string;
  sellPrice: string;
  stock: number;
  createdAt: string;
  productName?: string;
  productImage?: string;
}

interface SaleWithProduct extends Sale {
  productDetails?: {
    name: string;
    image: string;
    code?: string;
  };
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<SaleWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<SaleWithProduct | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Obtener todas las ventas y todos los productos en paralelo
      const [salesResponse, productsResponse] = await Promise.all([
        fetch("/api/saleProduct", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/products/all?onlyPublished=false&withValidPrices=false", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const salesData = await salesResponse.json();
      const productsData = await productsResponse.json();

      if (salesData.success && productsData.success) {
        // Crear un mapa de productos para acceso rápido
        const productsMap = new Map(
          productsData.products.map((product: any) => {
            // Obtener la primera imagen disponible (de images array o image)
            const firstImage = product.images?.[0] || product.image || null;
            return [
              product._id,
              {
                name: product.name,
                image: firstImage,
                code: product.code,
              },
            ];
          })
        );

        // Mapear ventas con información de productos
        const salesWithProducts = salesData.sales.map((sale: Sale) => ({
          ...sale,
          productDetails: productsMap.get(sale.idProduct) || null,
        }));

        setSales(salesWithProducts);
      }
    } catch (error) {
      console.error("Error al cargar ventas:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las ventas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (sale: SaleWithProduct) => {
    setSaleToDelete(sale);
  };

  const handleConfirmDelete = async () => {
    if (!saleToDelete) return;

    try {
      setDeleteLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/saleProduct?id=${saleToDelete._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Venta eliminada",
          description: `Stock restaurado: ${data.quantityRestored} unidades. Stock actual: ${data.newStock}`,
        });
        // Recargar la lista de ventas
        loadSales();
      } else {
        toast({
          title: "Error",
          description: data.message || "Error al eliminar la venta",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error al eliminar venta:", error);
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
      setSaleToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateTotals = () => {
    const totalRevenue = sales.reduce(
      (sum, sale) => sum + parseFloat(sale.sellPrice) * sale.stock,
      0
    );
    const totalUnits = sales.reduce((sum, sale) => sum + sale.stock, 0);
    return { totalRevenue, totalUnits };
  };

  const { totalRevenue, totalUnits } = calculateTotals();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <History className="h-8 w-8 text-blue-600" />
            Historial de Ventas
          </h1>
          <p className="text-gray-600 mt-2">
            Gestiona y revisa todas las ventas registradas
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Ventas</p>
                <p className="text-2xl font-bold text-gray-900">{sales.length}</p>
              </div>
              <History className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unidades Vendidas</p>
                <p className="text-2xl font-bold text-green-600">{totalUnits}</p>
              </div>
              <Package className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ingresos Totales</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatToARS(totalRevenue)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de ventas */}
      <Card>
        <CardHeader>
          <CardTitle>Todas las Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500 py-8">Cargando ventas...</p>
          ) : sales.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No hay ventas registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {sale.productDetails?.image ? (
                            <img
                              src={sale.productDetails.image}
                              alt={sale.productDetails.name || "Producto"}
                              className="w-10 h-10 rounded object-cover border border-gray-200"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.jpg";
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center border border-gray-300">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">
                              {sale.productDetails?.name || "Producto eliminado"}
                            </p>
                            {!sale.productDetails && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                Producto no disponible
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {sale.productDetails?.code || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="font-semibold">
                          {sale.stock} unidades
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatToARS(parseFloat(sale.sellPrice))}
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-600">
                        {formatToARS(parseFloat(sale.sellPrice) * sale.stock)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          {formatDate(sale.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(sale)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={deleteLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Dialog para confirmar eliminación */}
      <AlertDialog
        open={!!saleToDelete}
        onOpenChange={(open) => !open && setSaleToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta venta?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Esta acción eliminará la venta y restaurará el stock del producto.</p>
              {saleToDelete && (
                <div className="bg-blue-50 p-3 rounded-lg mt-3 space-y-1">
                  <p className="font-medium text-sm text-blue-900">
                    Producto: {saleToDelete.productDetails?.name || "Desconocido"}
                  </p>
                  <p className="text-sm text-blue-800">
                    Cantidad a restaurar: <strong>{saleToDelete.stock} unidades</strong>
                  </p>
                  <p className="text-sm text-blue-800">
                    Monto: <strong>{formatToARS(parseFloat(saleToDelete.sellPrice) * saleToDelete.stock)}</strong>
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? "Eliminando..." : "Eliminar Venta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
