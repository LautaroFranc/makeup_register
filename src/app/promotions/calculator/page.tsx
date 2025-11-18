"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calculator,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Info,
  Tag,
  Percent,
  Gift,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatToARS } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Product {
  _id: string;
  name: string;
  buyPrice: string;
  sellPrice: string;
  stock: number;
}

interface CalculationResult {
  isDifferentProducts: boolean;
  mainProduct: {
    name: string;
    buyPrice: number;
    sellPrice: number;
  };
  giftProduct?: {
    name: string;
    buyPrice: number;
    sellPrice: number;
  } | null;
  promotion2x1: {
    totalCost: number;
    clientPays: number;
    profit: number;
    margin: number;
    marginStatus: string;
    isRentable: boolean;
  };
  comparison: {
    normalRevenue2Units: number;
    promotionRevenue: number;
    discountAmount: number;
    discountPercentage: number;
  };
  recommendations: Array<{
    type: string;
    message: string;
  }>;
}

export default function PromotionCalculator() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedGiftProduct, setSelectedGiftProduct] = useState<string>("");
  const [isDifferentProducts, setIsDifferentProducts] = useState(false);
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const { toast } = useToast();

  // Cargar productos al montar el componente
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/products/all", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success && data.products) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error("Error al cargar productos:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  // Filtrar productos elegibles como regalo
  const eligibleGiftProducts = useMemo(() => {
    if (!selectedProduct) return [];

    const mainProduct = products.find((p) => p._id === selectedProduct);
    if (!mainProduct) return [];

    const mainBuyPrice = parseFloat(mainProduct.buyPrice);

    // Filtrar: más barato que el principal Y con stock
    return products.filter((p) => {
      const buyPrice = parseFloat(p.buyPrice);
      return (
        p._id !== selectedProduct && // No el mismo
        buyPrice < mainBuyPrice && // Más barato
        p.stock > 0 // Con stock
      );
    });
  }, [products, selectedProduct]);

  const handleCalculate = async () => {
    if (!selectedProduct) {
      toast({
        title: "Producto requerido",
        description: "Selecciona un producto principal",
        variant: "destructive",
      });
      return;
    }

    if (isDifferentProducts && !selectedGiftProduct) {
      toast({
        title: "Producto regalo requerido",
        description: "Selecciona un producto regalo o cambia a 'mismo producto'",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/promotions/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: selectedProduct,
          giftProductId: isDifferentProducts ? selectedGiftProduct : null,
          type: "2x1",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCalculation(data);
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al calcular",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error al calcular:", error);
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePromotion = async () => {
    if (!calculation) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/promotions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: calculation.isDifferentProducts
            ? `2x1 - ${calculation.mainProduct.name} + ${calculation.giftProduct?.name}`
            : `2x1 - ${calculation.mainProduct.name}`,
          type: "2x1",
          product: selectedProduct,
          giftProduct: isDifferentProducts ? selectedGiftProduct : null,
          specialPrice: calculation.promotion2x1.clientPays,
          margin: calculation.promotion2x1.margin || 0,
          startDate: new Date(),
          isActive: true,
          description: calculation.isDifferentProducts
            ? `Promoción combinada: ${calculation.mainProduct.name} + ${calculation.giftProduct?.name} gratis. Margen: ${(calculation.promotion2x1.margin || 0).toFixed(1)}%`
            : `Promoción 2x1 mismo producto. Margen: ${(calculation.promotion2x1.margin || 0).toFixed(1)}%`,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Promoción guardada",
          description: "La promoción se guardó exitosamente",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al guardar promoción",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error al guardar promoción:", error);
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      });
    }
  };

  const getMarginColor = (status: string) => {
    switch (status) {
      case "excelente":
        return "text-green-600 bg-green-50 border-green-200";
      case "bueno":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "aceptable":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "bajo":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "perdida":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "success":
        return CheckCircle;
      case "warning":
        return AlertCircle;
      case "error":
        return XCircle;
      default:
        return Info;
    }
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-green-600 bg-green-50 border-green-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-blue-600 bg-blue-50 border-blue-200";
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Calculator className="h-8 w-8 text-blue-600" />
          Calculadora de Promociones 2x1
        </h1>
        <p className="text-gray-600 mt-2">
          Calcula si tu promoción es rentable - mismo producto o productos combinados
        </p>
      </div>

      {/* Formulario de cálculo */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de la Promoción</CardTitle>
          <CardDescription>
            Selecciona los productos y el sistema calculará la rentabilidad
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle de modo */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              {isDifferentProducts ? <Gift className="h-5 w-5 text-blue-600" /> : <Tag className="h-5 w-5 text-blue-600" />}
              <div>
                <Label className="text-sm font-semibold text-gray-900">
                  {isDifferentProducts ? "Productos Diferentes" : "Mismo Producto"}
                </Label>
                <p className="text-xs text-gray-600">
                  {isDifferentProducts
                    ? "Elige producto principal y producto regalo"
                    : "2x1 del mismo producto"}
                </p>
              </div>
            </div>
            <Switch
              checked={isDifferentProducts}
              onCheckedChange={(checked) => {
                setIsDifferentProducts(checked);
                setSelectedGiftProduct("");
                setCalculation(null);
              }}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Producto principal */}
            <div className="space-y-2">
              <Label htmlFor="product">
                {isDifferentProducts ? "Producto Principal (que se vende)" : "Producto"}
              </Label>
              <Select
                value={selectedProduct}
                onValueChange={(value) => {
                  setSelectedProduct(value);
                  setSelectedGiftProduct("");
                  setCalculation(null);
                }}
                disabled={loadingProducts}
              >
                <SelectTrigger id="product">
                  <SelectValue placeholder={loadingProducts ? "Cargando..." : "Selecciona un producto"} />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product._id} value={product._id}>
                      {product.name} - {formatToARS(parseFloat(product.sellPrice))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Producto regalo (solo si es modo diferente) */}
            {isDifferentProducts && (
              <div className="space-y-2">
                <Label htmlFor="giftProduct">Producto Regalo (gratis para el cliente)</Label>
                <Select
                  value={selectedGiftProduct}
                  onValueChange={(value) => {
                    setSelectedGiftProduct(value);
                    setCalculation(null);
                  }}
                  disabled={!selectedProduct}
                >
                  <SelectTrigger id="giftProduct">
                    <SelectValue placeholder={!selectedProduct ? "Primero elige el producto principal" : "Selecciona el regalo"} />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleGiftProducts.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No hay productos elegibles como regalo
                      </SelectItem>
                    ) : (
                      eligibleGiftProducts.map((product) => (
                        <SelectItem key={product._id} value={product._id}>
                          {product.name} - Costo: {formatToARS(parseFloat(product.buyPrice))} | Stock: {product.stock}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Solo productos más baratos que el principal y con stock
                </p>
              </div>
            )}
          </div>

          <Button
            onClick={handleCalculate}
            disabled={loading || !selectedProduct || (isDifferentProducts && !selectedGiftProduct)}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {loading ? "Calculando..." : "Calcular Rentabilidad"}
          </Button>
        </CardContent>
      </Card>

      {/* Resultados */}
      {calculation && (
        <>
          {/* Tabla comparativa */}
          <Card className={`border-2 ${calculation.promotion2x1.isRentable ? "border-green-200" : "border-red-200"}`}>
            <CardHeader className={calculation.promotion2x1.isRentable ? "bg-green-50" : "bg-red-50"}>
              <CardTitle className="text-xl flex items-center gap-2">
                {calculation.promotion2x1.isRentable ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                {calculation.promotion2x1.isRentable ? "Promoción Rentable" : "Promoción con Pérdida"}
              </CardTitle>
              <CardDescription>
                {calculation.isDifferentProducts
                  ? `Cliente paga ${calculation.mainProduct.name} y recibe ${calculation.giftProduct?.name} gratis`
                  : `Cliente paga 1 ${calculation.mainProduct.name} y recibe otro gratis`}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Concepto</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Precio que paga el cliente</TableCell>
                    <TableCell className="text-right text-lg font-bold text-blue-600">
                      {formatToARS(calculation.promotion2x1.clientPays)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Costo producto principal</TableCell>
                    <TableCell className="text-right">{formatToARS(calculation.mainProduct.buyPrice)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Costo producto {calculation.isDifferentProducts ? "regalo" : "adicional"}</TableCell>
                    <TableCell className="text-right">
                      {formatToARS(calculation.giftProduct?.buyPrice || calculation.mainProduct.buyPrice)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold">Costo Total</TableCell>
                    <TableCell className="text-right font-bold">
                      {formatToARS(calculation.promotion2x1.totalCost)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-gray-50">
                    <TableCell className="font-semibold text-lg">
                      {calculation.promotion2x1.profit >= 0 ? "Ganancia" : "Pérdida"}
                    </TableCell>
                    <TableCell className={`text-right text-xl font-bold ${calculation.promotion2x1.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatToARS(Math.abs(calculation.promotion2x1.profit))}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold">Margen de Ganancia</TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getMarginColor(calculation.promotion2x1.marginStatus)}`}>
                        {(calculation.promotion2x1.margin || 0).toFixed(1)}% ({calculation.promotion2x1.marginStatus})
                      </span>
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-t">
                    <TableCell>Precio normal de ambos productos</TableCell>
                    <TableCell className="text-right text-gray-500">
                      {formatToARS(calculation.comparison.normalRevenue2Units)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Descuento percibido por cliente</TableCell>
                    <TableCell className="text-right text-purple-600 font-semibold">
                      {formatToARS(calculation.comparison.discountAmount)} ({(calculation.comparison.discountPercentage || 0).toFixed(1)}%)
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="bg-gray-50 justify-end">
              <Button
                onClick={handleSavePromotion}
                disabled={!calculation.promotion2x1.isRentable}
                className={calculation.promotion2x1.isRentable ? "bg-green-600 hover:bg-green-700" : ""}
                variant={calculation.promotion2x1.isRentable ? "default" : "outline"}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {calculation.promotion2x1.isRentable ? "Guardar Promoción" : "No Rentable - No se puede guardar"}
              </Button>
            </CardFooter>
          </Card>

          {/* Recomendaciones */}
          {calculation.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Análisis y Recomendaciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {calculation.recommendations.map((rec, index) => {
                  const Icon = getRecommendationIcon(rec.type);
                  const colorClass = getRecommendationColor(rec.type);

                  return (
                    <div key={index} className={`flex items-start gap-3 p-3 rounded-lg border ${colorClass}`}>
                      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{rec.message}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Info card */}
      {!calculation && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm text-gray-700">
                <p className="font-semibold text-blue-900">Dos formas de crear 2x1:</p>
                <ul className="space-y-1 list-disc list-inside ml-2">
                  <li><strong>Mismo producto:</strong> Cliente paga 1 y lleva 2 del mismo producto</li>
                  <li><strong>Productos diferentes:</strong> Cliente paga producto A y recibe producto B gratis</li>
                </ul>
                <p className="text-xs text-gray-600 mt-3">
                  El sistema valida que la promoción sea rentable considerando los costos reales de los productos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
