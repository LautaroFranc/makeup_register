"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, Save, Upload, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/CurrencyInput";
import { CategorySelector } from "@/components/CategorySelect";
import { ImageUploadSquare } from "@/components/ImageUploadSquare";
import { DynamicAttributes } from "@/components/DynamicAttributes";
import { useToast } from "@/hooks/use-toast";

interface Product {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  images?: string[];
  attributes?: {
    [key: string]: string[];
  };
  buyPrice: string;
  sellPrice: string;
  stock: number;
  code: string;
  category: string;
  published: boolean;
}

interface ProductEditModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProduct: Partial<Product>) => void;
  onRefresh?: () => void;
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  product,
  isOpen,
  onClose,
  onSave,
  onRefresh,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    buyPrice: 0,
    sellPrice: 0,
    stock: 0,
    category: "",
    margin: 0,
    published: true,
  });
  const [image, setImage] = useState<string>("");
  const [images, setImages] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [uploadedMainImage, setUploadedMainImage] = useState<File | null>(null);
  const [attributes, setAttributes] = useState<{ [key: string]: string[] }>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Cargar datos del producto cuando se abre el modal
  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        name: product.name,
        description: product.description || "",
        buyPrice: parseFloat(product.buyPrice) || 0,
        sellPrice: parseFloat(product.sellPrice) || 0,
        stock: product.stock,
        category: product.category,
        margin: 0,
        published: product.published,
      });
      setImage(product.image || "");
      setImages(product.images || []);
      setAttributes(product.attributes || {});
      setUploadedImages([]);
      setUploadedMainImage(null);
      setRemovedImages([]);
    }
  }, [product, isOpen]);

  // Calcular margen automáticamente
  useEffect(() => {
    if (formData.buyPrice > 0 && formData.sellPrice > 0) {
      const margin =
        ((formData.sellPrice - formData.buyPrice) / formData.buyPrice) * 100;
      setFormData((prev) => ({ ...prev, margin: Number(margin.toFixed(2)) }));
    }
  }, [formData.buyPrice, formData.sellPrice]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleMarginChange = (newMargin: number) => {
    setFormData((prev) => {
      const newSalePrice = prev.buyPrice * (1 + newMargin / 100);
      return {
        ...prev,
        margin: newMargin,
        sellPrice: Number(newSalePrice.toFixed(2)),
      };
    });
  };

  const handleSalePriceChange = (newSalePrice: number) => {
    setFormData((prev) => {
      const newMargin = ((newSalePrice - prev.buyPrice) / prev.buyPrice) * 100;
      return {
        ...prev,
        sellPrice: newSalePrice,
        margin: Number(newMargin.toFixed(2)),
      };
    });
  };

  const handleMainImageChange = (file: File | null) => {
    setUploadedMainImage(file);
  };

  const handleRemoveMainImage = () => {
    setImage("");
    setUploadedMainImage(null);
  };

  const handleRemoveImage = (imageUrl: string) => {
    // Agregar a la lista de imágenes eliminadas
    setRemovedImages((prev) => [...prev, imageUrl]);
    // Remover de la lista de imágenes actuales
    setImages((prev) => prev.filter((img) => img !== imageUrl));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Crear FormData para enviar los datos
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("buyPrice", formData.buyPrice.toString());
      formDataToSend.append("sellPrice", formData.sellPrice.toString());
      formDataToSend.append("stock", formData.stock.toString());
      formDataToSend.append("category", formData.category);
      // Validar y limpiar attributes antes de serializar
      const cleanAttributes = Object.keys(attributes).reduce((acc, key) => {
        const values = attributes[key];
        if (Array.isArray(values) && values.length > 0) {
          acc[key] = values.filter(
            (value) => value && typeof value === "string" && value.trim() !== ""
          );
        }
        return acc;
      }, {} as { [key: string]: string[] });

      try {
        const attributesJson = JSON.stringify(cleanAttributes);
        console.log("Attributes a enviar:", cleanAttributes);
        console.log("JSON generado:", attributesJson);
        formDataToSend.append("attributes", attributesJson);
      } catch (error) {
        console.error("Error serializando attributes:", error);
        formDataToSend.append("attributes", JSON.stringify({}));
      }

      // Agregar imágenes eliminadas
      if (removedImages.length > 0) {
        formDataToSend.append("removedImages", JSON.stringify(removedImages));
      }

      // Agregar imagen principal si la hay
      if (uploadedMainImage) {
        formDataToSend.append("image", uploadedMainImage);
      }

      // Agregar nuevas imágenes si las hay
      uploadedImages.forEach((image) => {
        formDataToSend.append("images", image);
      });

      // Debug: mostrar todos los datos del FormData
      console.log("FormData completo:");
      for (let [key, value] of formDataToSend.entries()) {
        console.log(`${key}:`, value);
      }

      // Llamada a la API para actualizar el producto
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/products?id=${product!._id}`, {
        method: "PUT",
        body: formDataToSend,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success || response.ok) {
        // Notificar al componente padre sobre la actualización exitosa
        const updatedProduct = {
          ...product!,
          name: formData.name,
          description: formData.description,
          image: image,
          buyPrice: formData.buyPrice.toString(),
          sellPrice: formData.sellPrice.toString(),
          stock: formData.stock,
          category: formData.category,
          images: images,
          attributes: attributes,
          published: formData.published,
        };

        onSave(updatedProduct);

        toast({
          description: "Producto actualizado exitosamente!",
          variant: "default",
        });

        // Recargar datos de la tabla
        if (onRefresh) {
          onRefresh();
        }

        // Solo cerrar el modal después de la actualización exitosa
        onClose();
      } else {
        throw new Error(result.error || "Error al actualizar el producto");
      }
    } catch (error) {
      console.error("Error al actualizar el producto:", error);
      toast({
        description: `Error al actualizar el producto: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[85vh] overflow-hidden relative"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 50,
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Editar Producto: {product.name}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Overlay de loading */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              <p className="text-lg font-medium text-gray-700">
                Guardando cambios...
              </p>
              <p className="text-sm text-gray-500">
                Por favor espera mientras se actualiza el producto
              </p>
            </div>
          </div>
        )}

        <div className="overflow-y-auto max-h-[calc(85vh-120px)]">
          <form onSubmit={handleSubmit} className="space-y-6 p-1">
            {/* Información Básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                Información Básica
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div className="md:col-span-2">
                  <Label htmlFor="name">Nombre del Producto</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Nombre del producto"
                    required
                  />
                </div>
                {/* Descripción */}
                <div className="md:col-span-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    placeholder="Descripción del producto"
                    rows={3}
                  />
                </div>
                {/* Categoría */}
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <div className="relative z-[180]">
                    <CategorySelector
                      value={formData.category}
                      onChange={(value) => handleInputChange("category", value)}
                      inModal={true}
                    />
                  </div>
                </div>
                {/* Stock */}
                <div>
                  <Label htmlFor="stock">Stock</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) =>
                      handleInputChange("stock", Number(e.target.value))
                    }
                    placeholder="Cantidad en stock"
                    required
                    min="0"
                    step="1"
                  />
                </div>
              </div>
            </div>

            {/* Precios */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                Precios y Margen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Precio de compra */}
                <div>
                  <CurrencyInput
                    label="Precio de Compra ($)"
                    value={formData.buyPrice}
                    onChange={(value) => handleInputChange("buyPrice", value)}
                  />
                </div>
                {/* Margen */}
                <div>
                  <Label htmlFor="margin">Margen (%)</Label>
                  <Input
                    id="margin"
                    type="number"
                    value={formData.margin}
                    onChange={(e) => handleMarginChange(Number(e.target.value))}
                    placeholder="Margen (%)"
                    min="0"
                    step="10"
                  />
                </div>
                {/* Precio de venta */}
                <div>
                  <CurrencyInput
                    label="Precio de Venta ($)"
                    value={formData.sellPrice}
                    onChange={(value) => handleSalePriceChange(value)}
                  />
                </div>
              </div>
            </div>

            {/* Imagen Principal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                Imagen Principal
              </h3>
              <div className="space-y-3">
                {image && (
                  <div className="relative">
                    <img
                      src={image}
                      alt="Imagen principal"
                      className="w-32 h-32 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={handleRemoveMainImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      handleMainImageChange(file);
                    }}
                    className="flex-1"
                  />
                  {uploadedMainImage && (
                    <span className="text-sm text-green-600">
                      ✓ Nueva imagen seleccionada
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Imágenes Adicionales */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                Imágenes Adicionales
              </h3>
              <ImageUploadSquare
                images={images}
                onImagesChange={setImages}
                uploadedImages={uploadedImages}
                onUploadedImagesChange={setUploadedImages}
                onRemoveImage={handleRemoveImage}
              />
            </div>

            {/* Atributos Dinámicos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                Atributos del Producto
              </h3>
              <DynamicAttributes
                attributes={attributes}
                onAttributesChange={setAttributes}
              />
            </div>

            {/* Configuración de Visibilidad */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                Configuración de Visibilidad
              </h3>
              <div className="flex items-center space-x-3">
                <Switch
                  id="published"
                  checked={formData.published}
                  onCheckedChange={(checked) =>
                    handleInputChange("published", checked)
                  }
                />
                <Label htmlFor="published" className="text-sm font-medium">
                  {formData.published ? "Producto Público" : "Producto Privado"}
                </Label>
              </div>
              <p className="text-xs text-gray-500">
                {formData.published
                  ? "Este producto será visible en catálogos públicos"
                  : "Este producto solo será visible en tu panel privado"}
              </p>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Cancelar"
                )}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="min-w-[120px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
