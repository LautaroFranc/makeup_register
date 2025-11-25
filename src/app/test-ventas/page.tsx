"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, ShoppingCart, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductItem {
  id: string;
  productId: string;
  quantity: number;
  sellPrice?: string;
}

interface SaleResult {
  success: boolean;
  message: string;
  sales?: any[];
  products?: any[];
  errors?: any[];
}

export default function TestVentasPage() {
  const [storeSlug, setStoreSlug] = useState("");
  const [products, setProducts] = useState<ProductItem[]>([
    { id: "1", productId: "", quantity: 1, sellPrice: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SaleResult | null>(null);
  const { toast } = useToast();

  // Agregar producto
  const addProduct = () => {
    setProducts([
      ...products,
      {
        id: Date.now().toString(),
        productId: "",
        quantity: 1,
        sellPrice: "",
      },
    ]);
  };

  // Eliminar producto
  const removeProduct = (id: string) => {
    if (products.length > 1) {
      setProducts(products.filter((p) => p.id !== id));
    }
  };

  // Actualizar producto
  const updateProduct = (
    id: string,
    field: keyof ProductItem,
    value: string | number
  ) => {
    setProducts(
      products.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Registrar venta (múltiples productos)
  const handleSubmitMultiple = async () => {
    if (!storeSlug.trim()) {
      toast({
        title: "Error",
        description: "Debes ingresar el slug de la tienda",
        variant: "destructive",
      });
      return;
    }

    const validProducts = products.filter((p) => p.productId.trim());
    if (validProducts.length === 0) {
      toast({
        title: "Error",
        description: "Debes agregar al menos un producto con ID válido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const payload = {
        products: validProducts.map((p) => ({
          productId: p.productId,
          quantity: p.quantity,
          ...(p.sellPrice ? { sellPrice: p.sellPrice } : {}),
        })),
      };

      console.log("Enviando payload:", payload);

      const response = await fetch(`/api/saleProduct/public/${storeSlug}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      console.log("Respuesta del servidor:", data);
      setResult(data);

      if (data.success) {
        toast({
          title: "¡Éxito!",
          description: data.message,
        });
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error al registrar venta:", error);
      toast({
        title: "Error de conexión",
        description: error.message,
        variant: "destructive",
      });
      setResult({
        success: false,
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Registrar venta (producto único - para pruebas)
  const handleSubmitSingle = async () => {
    if (!storeSlug.trim() || !products[0]?.productId.trim()) {
      toast({
        title: "Error",
        description: "Debes ingresar el slug y el ID del producto",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const payload = {
        productId: products[0].productId,
        quantity: products[0].quantity,
        ...(products[0].sellPrice ? { sellPrice: products[0].sellPrice } : {}),
      };

      console.log("Enviando payload (único):", payload);

      const response = await fetch(`/api/saleProduct/public/${storeSlug}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      console.log("Respuesta del servidor:", data);
      setResult(data);

      if (data.success) {
        toast({
          title: "¡Éxito!",
          description: data.message,
        });
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error al registrar venta:", error);
      toast({
        title: "Error de conexión",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Test de Ventas Públicas
          </h1>
          <p className="text-gray-600 mt-2">
            Prueba el endpoint POST /api/saleProduct/public/[slug]
          </p>
        </div>

        {/* Formulario */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración de la Venta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Slug de la tienda */}
            <div>
              <Label htmlFor="storeSlug">Slug de la Tienda</Label>
              <Input
                id="storeSlug"
                value={storeSlug}
                onChange={(e) => setStoreSlug(e.target.value)}
                placeholder="mi-tienda"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                El slug único de la tienda (ej: mi-tienda, juan-perez)
              </p>
            </div>

            <hr />

            {/* Lista de productos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Productos a Vender</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addProduct}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Producto
                </Button>
              </div>

              {products.map((product, index) => (
                <Card key={product.id} className="bg-gray-50">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Product ID */}
                        <div className="md:col-span-2">
                          <Label htmlFor={`productId-${product.id}`}>
                            Product ID
                          </Label>
                          <Input
                            id={`productId-${product.id}`}
                            value={product.productId}
                            onChange={(e) =>
                              updateProduct(
                                product.id,
                                "productId",
                                e.target.value
                              )
                            }
                            placeholder="507f1f77bcf86cd799439011"
                            className="mt-1"
                          />
                        </div>

                        {/* Quantity */}
                        <div>
                          <Label htmlFor={`quantity-${product.id}`}>
                            Cantidad
                          </Label>
                          <Input
                            id={`quantity-${product.id}`}
                            type="number"
                            min="1"
                            value={product.quantity}
                            onChange={(e) =>
                              updateProduct(
                                product.id,
                                "quantity",
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="mt-1"
                          />
                        </div>

                        {/* Sell Price (opcional) */}
                        <div className="md:col-span-3">
                          <Label htmlFor={`sellPrice-${product.id}`}>
                            Precio Venta (Opcional)
                          </Label>
                          <Input
                            id={`sellPrice-${product.id}`}
                            value={product.sellPrice}
                            onChange={(e) =>
                              updateProduct(
                                product.id,
                                "sellPrice",
                                e.target.value
                              )
                            }
                            placeholder="45.99"
                            className="mt-1"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Dejar vacío para usar el precio del producto
                          </p>
                        </div>
                      </div>

                      {/* Botón eliminar */}
                      {products.length > 1 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => removeProduct(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSubmitMultiple}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Registrar Venta (Array)
                  </>
                )}
              </Button>

              {products.length === 1 && (
                <Button
                  onClick={handleSubmitSingle}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 mr-2 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Registrar Venta (Único)
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resultado */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                Resultado de la Operación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mensaje */}
              <div>
                <Badge variant={result.success ? "default" : "destructive"}>
                  {result.success ? "ÉXITO" : "ERROR"}
                </Badge>
                <p className="mt-2 text-sm">{result.message}</p>
              </div>

              {/* Ventas exitosas */}
              {result.sales && result.sales.length > 0 && (
                <div>
                  <h4 className="font-semibold text-green-600 mb-2">
                    ✅ Ventas Registradas ({result.sales.length})
                  </h4>
                  <div className="space-y-2">
                    {result.sales.map((sale: any, index: number) => (
                      <Card key={index} className="bg-green-50">
                        <CardContent className="p-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">Producto:</span>
                              <p className="font-medium">{sale.productName}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Cantidad:</span>
                              <p className="font-medium">{sale.quantity}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Precio:</span>
                              <p className="font-medium">${sale.sellPrice}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">ID:</span>
                              <p className="font-mono text-xs">{sale._id}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Productos actualizados */}
              {result.products && result.products.length > 0 && (
                <div>
                  <h4 className="font-semibold text-blue-600 mb-2">
                    📦 Stock Actualizado
                  </h4>
                  <div className="space-y-2">
                    {result.products.map((product: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 bg-blue-50 rounded"
                      >
                        <span className="font-medium">{product.name}</span>
                        <Badge variant="secondary">
                          Stock restante: {product.stockRestante}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errores */}
              {result.errors && result.errors.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">
                    ❌ Errores ({result.errors.length})
                  </h4>
                  <div className="space-y-2">
                    {result.errors.map((error: any, index: number) => (
                      <Card key={index} className="bg-red-50">
                        <CardContent className="p-3">
                          <div className="text-sm">
                            {error.productName && (
                              <p className="font-medium text-red-900">
                                Producto: {error.productName}
                              </p>
                            )}
                            <p className="text-red-600">{error.error}</p>
                            {error.productId && (
                              <p className="text-xs text-gray-600 mt-1">
                                ID: {error.productId}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* JSON completo (debug) */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                  Ver JSON completo
                </summary>
                <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}

        {/* Instrucciones */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">📖 Instrucciones</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <ol className="list-decimal list-inside space-y-1">
              <li>Ingresa el <strong>slug de la tienda</strong> (ej: mi-tienda)</li>
              <li>Agrega uno o más productos con sus <strong>Product IDs</strong></li>
              <li>Especifica la <strong>cantidad</strong> para cada producto</li>
              <li>
                Opcionalmente, ingresa un <strong>precio personalizado</strong>
              </li>
              <li>
                Haz clic en <strong>"Registrar Venta (Array)"</strong> para
                múltiples productos
              </li>
              <li>
                O usa <strong>"Registrar Venta (Único)"</strong> para un solo
                producto
              </li>
            </ol>
            <p className="text-gray-600 mt-4">
              💡 <strong>Tip:</strong> Abre la consola del navegador (F12) para
              ver los logs detallados de la petición y respuesta.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
