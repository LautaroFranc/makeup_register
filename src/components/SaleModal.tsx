import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  DollarSign,
  Package,
  Calculator,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatToARS } from "@/lib/utils";
import Image from "next/image";

interface Product {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  images?: string[];
  buyPrice: string;
  sellPrice: string;
  stock: number;
  category: string;
  code: string;
}

interface SaleModalProps {
  product: Product | null;
  onClose: () => void;
  onConfirm: (saleData: { productId: string; quantity: number }) => void;
  loading: boolean;
}

const SaleModal: React.FC<SaleModalProps> = ({
  product,
  onClose,
  onConfirm,
  loading,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [error, setError] = useState<string>("");

  // Calcular total cuando cambie la cantidad o el producto
  useEffect(() => {
    if (product && quantity > 0) {
      const unitPrice = parseFloat(product.sellPrice);
      setTotal(unitPrice * quantity);
      setError("");
    } else {
      setTotal(0);
    }
  }, [quantity, product]);

  const handleQuantityChange = (value: string) => {
    const qty = parseInt(value, 10) || 0;
    setQuantity(qty);

    if (qty > (product?.stock || 0)) {
      setError(`No hay suficiente stock. Disponible: ${product?.stock}`);
    } else if (qty <= 0) {
      setError("La cantidad debe ser mayor a 0");
    } else {
      setError("");
    }
  };

  const handleConfirm = async () => {
    if (!product) return;

    if (quantity <= 0) {
      setError("La cantidad debe ser mayor a 0");
      return;
    }

    if (quantity > product.stock) {
      setError(`No hay suficiente stock. Disponible: ${product.stock}`);
      return;
    }

    onConfirm({ productId: product._id, quantity });
  };

  const getProductImage = () => {
    if (product?.image) return product.image;
    if (product?.images && product.images.length > 0) return product.images[0];
    return "/placeholder.svg";
  };

  const calculateMargin = () => {
    if (!product) return 0;
    const buyPrice = parseFloat(product.buyPrice);
    const sellPrice = parseFloat(product.sellPrice);
    return ((sellPrice - buyPrice) / buyPrice) * 100;
  };

  const calculateProfit = () => {
    if (!product || quantity <= 0) return 0;
    const buyPrice = parseFloat(product.buyPrice);
    const sellPrice = parseFloat(product.sellPrice);
    return (sellPrice - buyPrice) * quantity;
  };

  if (!product) return null;

  return (
    <Dialog open={!!product} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <ShoppingCart className="h-5 w-5" />
            Registrar Venta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del Producto */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Imagen del producto */}
                <div className="flex-shrink-0">
                  <Image
                    src={getProductImage()}
                    alt={product.name}
                    width={80}
                    height={80}
                    className="rounded-lg object-cover border"
                  />
                </div>

                {/* Información del producto */}
                <div className="flex-1 space-y-2">
                  <div>
                    <h3 className="font-semibold text-lg">{product.name}</h3>
                    <p className="text-sm text-gray-600">
                      {product.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{product.code}</Badge>
                    <Badge variant="secondary">{product.category}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-medium">
                        Precio: {formatToARS(parseFloat(product.sellPrice))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">
                        Stock: {product.stock}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuración de Venta */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Configurar Venta
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Cantidad a Vender</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      min="1"
                      max={product.stock}
                      placeholder="Ingrese la cantidad"
                      className="mt-1"
                    />
                    {error && (
                      <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                        <AlertCircle className="h-3 w-3" />
                        <span>{error}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Stock Disponible</Label>
                    <div className="mt-1 p-2 bg-gray-50 rounded-md border">
                      <span className="font-medium">
                        {product.stock} unidades
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumen de Venta */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Resumen de Venta
              </h4>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Precio unitario:</span>
                  <span className="font-medium">
                    {formatToARS(parseFloat(product.sellPrice))}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Cantidad:</span>
                  <span className="font-medium">{quantity}</span>
                </div>

                <div className="flex justify-between">
                  <span>Margen por unidad:</span>
                  <span
                    className={`font-medium ${
                      calculateMargin() >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {calculateMargin().toFixed(2)}%
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Ganancia total:</span>
                  <span
                    className={`font-medium ${
                      calculateProfit() >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatToARS(calculateProfit())}
                  </span>
                </div>

                <hr className="my-2" />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total a Cobrar:</span>
                  <span className="text-green-600">{formatToARS(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={
                loading || quantity <= 0 || quantity > product.stock || !!error
              }
              className="min-w-[140px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Venta
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaleModal;
