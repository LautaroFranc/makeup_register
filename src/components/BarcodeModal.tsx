import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, X, Loader2 } from "lucide-react";
import BarcodeDisplay from "./BarcodeDisplay";
import { Product } from "@/interface/product";
import { generateArgentineBarcode } from "@/lib/barcodeUtils";
import { useToast } from "@/hooks/use-toast";

interface BarcodeModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onProductUpdate?: (productId: string, updatedProduct: Product) => void;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({
  product,
  isOpen,
  onClose,
  onProductUpdate,
}) => {
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (product && isOpen) {
      setCurrentProduct(product);

      // Si el producto no tiene código de barras, generarlo automáticamente
      if (!product.barcode) {
        generateAndSaveBarcode();
      }
    }
  }, [product, isOpen]);

  const generateAndSaveBarcode = async () => {
    if (!product || isGenerating) return;

    setIsGenerating(true);
    try {
      // Generar código de barras único
      let barcode;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        barcode = generateArgentineBarcode("EAN13");
        attempts++;

        // Verificar si el código ya existe (opcional, ya que es muy improbable)
        const response = await fetch(
          `/api/products/check-barcode?barcode=${barcode}`
        );
        if (response.ok) {
          const data = await response.json();
          if (!data.exists) break;
        }
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        toast({
          title: "Error",
          description: "No se pudo generar un código de barras único",
          variant: "destructive",
        });
        return;
      }

      // Actualizar el producto con el nuevo código de barras
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/products/${product._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          barcode: barcode,
        }),
      });

      if (response.ok) {
        const updatedProduct = await response.json();
        setCurrentProduct(updatedProduct);

        // Notificar al componente padre sobre la actualización
        if (onProductUpdate) {
          onProductUpdate(product._id, updatedProduct);
        }

        toast({
          title: "Éxito",
          description: "Código de barras generado automáticamente",
          variant: "default",
        });
      } else {
        throw new Error("Error al actualizar el producto");
      }
    } catch (error) {
      console.error("Error generando código de barras:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el código de barras",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!currentProduct) return null;

  const handleDownload = () => {
    const canvas = document.querySelector("canvas");
    if (canvas) {
      const link = document.createElement("a");
      link.download = `codigo-barras-${currentProduct.name}-${currentProduct.barcode}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handlePrint = () => {
    const canvas = document.querySelector("canvas");
    if (canvas) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Código de Barras - ${currentProduct.name}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  padding: 20px;
                  margin: 0;
                }
                .product-info {
                  margin-bottom: 20px;
                }
                .product-name {
                  font-size: 18px;
                  font-weight: bold;
                  margin-bottom: 5px;
                }
                .product-code {
                  font-size: 14px;
                  color: #666;
                }
                canvas {
                  max-width: 100%;
                  height: auto;
                }
                @media print {
                  body { margin: 0; padding: 10px; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
               <div class="product-info">
                 <div class="product-name">${currentProduct.name}</div>
                 <div class="product-code">Código: ${currentProduct.code}</div>
                 <div class="product-barcode">Código de Barras: ${
                   currentProduct.barcode
                 }</div>
               </div>
              <img src="${canvas.toDataURL()}" alt="Código de Barras" />
              <div class="no-print">
                <button onclick="window.print()">Imprimir</button>
                <button onclick="window.close()">Cerrar</button>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Código de Barras</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del producto */}
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg">{currentProduct.name}</h3>
            <p className="text-gray-600">Código: {currentProduct.code}</p>
            <p className="text-gray-600">
              Código de Barras: {currentProduct.barcode || "Generando..."}
            </p>
            <p className="text-sm text-gray-500">
              Precio: ${currentProduct.sellPrice}
            </p>
          </div>

          {/* Código de barras */}
          <div className="flex justify-center">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-2 bg-white p-4 rounded-lg border">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="text-gray-600">
                  Generando código de barras...
                </span>
              </div>
            ) : currentProduct.barcode ? (
              <BarcodeDisplay
                value={currentProduct.barcode}
                format="EAN13"
                width={2}
                height={120}
                displayValue={true}
                fontSize={16}
                margin={15}
                className="bg-white p-4 rounded-lg border"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 bg-gray-100 p-4 rounded-lg border">
                <span className="text-gray-500">Sin código de barras</span>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              onClick={handleDownload}
              className="flex items-center gap-2"
              disabled={isGenerating || !currentProduct.barcode}
            >
              <Download className="h-4 w-4" />
              Descargar
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex items-center gap-2"
              disabled={isGenerating || !currentProduct.barcode}
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeModal;
