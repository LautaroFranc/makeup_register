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
import { X, Save, Upload, Loader2, Check, ChevronLeft, ChevronRight } from "lucide-react";
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
  wholesalePrice?: string;
  stock: number;
  code: string;
  category: string;
  published: boolean;
  hasDiscount?: boolean;
  discountPercentage?: number;
  discountedPrice?: string;
  discountStartDate?: string;
  discountEndDate?: string;
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
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const steps = [
    { num: 1, title: "Básicos" },
    { num: 2, title: "Precios" },
    { num: 3, title: "Detalles" },
    { num: 4, title: "Revisión" }
  ];

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    buyPrice: number;
    sellPrice: number;
    wholesalePrice: number;
    stock: number | string;
    category: string;
    margin: number | string;
    wholesaleMargin: number | string;
    published: boolean;
    hasDiscount: boolean;
    discountPercentage: number | string;
    discountStartDate: string;
    discountEndDate: string;
  }>({
    name: "",
    description: "",
    buyPrice: 0,
    sellPrice: 0,
    wholesalePrice: 0,
    stock: 0,
    category: "",
    margin: 0,
    wholesaleMargin: 0,
    published: true,
    hasDiscount: false,
    discountPercentage: 0,
    discountStartDate: "",
    discountEndDate: "",
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
      setStep(1); // Reset step on open
      const discountStart = product.discountStartDate
        ? new Date(product.discountStartDate).toISOString().split('T')[0]
        : "";
      const discountEnd = product.discountEndDate
        ? new Date(product.discountEndDate).toISOString().split('T')[0]
        : "";

      setFormData({
        name: product.name,
        description: product.description || "",
        buyPrice: parseFloat(product.buyPrice) || 0,
        sellPrice: parseFloat(product.sellPrice) || 0,
        wholesalePrice: parseFloat(product.wholesalePrice || "0"),
        stock: product.stock,
        category: product.category,
        margin: 0,
        wholesaleMargin: 0,
        published: product.published,
        hasDiscount: product.hasDiscount || false,
        discountPercentage: product.discountPercentage || 0,
        discountStartDate: discountStart,
        discountEndDate: discountEnd,
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
    if (formData.buyPrice > 0 && formData.wholesalePrice > 0) {
      const wholesaleMargin =
        ((formData.wholesalePrice - formData.buyPrice) / formData.buyPrice) * 100;
      setFormData((prev) => ({ ...prev, wholesaleMargin: Number(wholesaleMargin.toFixed(2)) }));
    }
  }, [formData.buyPrice, formData.sellPrice, formData.wholesalePrice]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleMarginChange = (newMargin: number | string) => {
    setFormData((prev) => {
      if (newMargin === "") return { ...prev, margin: "" };
      const numericMargin = Number(newMargin);
      const newSalePrice = prev.buyPrice * (1 + numericMargin / 100);
      return {
        ...prev,
        margin: newMargin,
        sellPrice: Number(newSalePrice.toFixed(2)),
      };
    });
  };

  const handleSalePriceChange = (newSalePrice: number) => {
    setFormData((prev) => {
      const newMargin = prev.buyPrice ? ((newSalePrice - prev.buyPrice) / prev.buyPrice) * 100 : 0;
      return {
        ...prev,
        sellPrice: newSalePrice,
        margin: Number(newMargin.toFixed(2)),
      };
    });
  };

  const handleWholesaleMarginChange = (newMargin: number | string) => {
    setFormData((prev) => {
      if (newMargin === "") return { ...prev, wholesaleMargin: "" };
      const numericMargin = Number(newMargin);
      const newWholesalePrice = prev.buyPrice * (1 + numericMargin / 100);
      return {
        ...prev,
        wholesaleMargin: newMargin,
        wholesalePrice: Number(newWholesalePrice.toFixed(2)),
      };
    });
  };

  const handleWholesalePriceChange = (newWholesalePrice: number) => {
    setFormData((prev) => {
      const newMargin = prev.buyPrice ? ((newWholesalePrice - prev.buyPrice) / prev.buyPrice) * 100 : 0;
      return {
        ...prev,
        wholesalePrice: newWholesalePrice,
        wholesaleMargin: Number(newMargin.toFixed(2)),
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
    setRemovedImages((prev) => [...prev, imageUrl]);
    setImages((prev) => prev.filter((img) => img !== imageUrl));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("buyPrice", formData.buyPrice.toString());
      formDataToSend.append("sellPrice", formData.sellPrice.toString());
      formDataToSend.append("wholesalePrice", formData.wholesalePrice.toString());
      formDataToSend.append("stock", formData.stock === "" ? "0" : formData.stock.toString());
      formDataToSend.append("category", formData.category);
      formDataToSend.append("published", formData.published.toString());
      formDataToSend.append("hasDiscount", formData.hasDiscount.toString());
      formDataToSend.append("discountPercentage", formData.discountPercentage === "" ? "0" : formData.discountPercentage.toString());
      if (formData.discountStartDate) formDataToSend.append("discountStartDate", formData.discountStartDate);
      if (formData.discountEndDate) formDataToSend.append("discountEndDate", formData.discountEndDate);
      
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
        formDataToSend.append("attributes", JSON.stringify(cleanAttributes));
      } catch (error) {
        formDataToSend.append("attributes", JSON.stringify({}));
      }

      if (removedImages.length > 0) {
        formDataToSend.append("removedImages", JSON.stringify(removedImages));
      }

      if (uploadedMainImage) {
        formDataToSend.append("image", uploadedMainImage);
      }

      uploadedImages.forEach((image) => {
        formDataToSend.append("images", image);
      });

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
        const updatedProduct = {
          ...product!,
          name: formData.name,
          description: formData.description,
          image: image,
          buyPrice: formData.buyPrice.toString(),
          sellPrice: formData.sellPrice.toString(),
          wholesalePrice: formData.wholesalePrice.toString(),
          stock: Number(formData.stock) || 0,
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

        if (onRefresh) onRefresh();
        onClose();
      } else {
        throw new Error(result.error || "Error al actualizar el producto");
      }
    } catch (error) {
      toast({
        description: `Error al actualizar el producto: ${error instanceof Error ? error.message : "Error desconocido"}`,
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
        className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 50,
        }}
      >
        <DialogHeader className="px-6 py-4 border-b shrink-0 bg-white">
          <DialogTitle className="text-xl">
            Editar: {product.name}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              <p className="text-lg font-medium text-gray-700">Guardando cambios...</p>
            </div>
          </div>
        )}

        {/* Progress Bar / Steps (Sticky) */}
        <div className="px-6 py-4 shrink-0 bg-gray-50/80 border-b">
          <div className="flex items-center justify-between relative max-w-2xl mx-auto">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-10 rounded"></div>
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 -z-10 rounded transition-all duration-300"
              style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
            ></div>
            
            {steps.map((s) => (
              <div key={s.num} className="flex flex-col items-center gap-2 px-2" style={{ backgroundColor: 'transparent' }}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors bg-white
                  ${step === s.num ? 'border-blue-600 bg-blue-600 text-white' : 
                    step > s.num ? 'border-blue-600 text-blue-600' : 'border-gray-300 text-gray-400'}`}>
                  {step > s.num ? <Check className="w-5 h-5" /> : s.num}
                </div>
                <span className={`text-xs font-medium ${step >= s.num ? 'text-gray-900' : 'text-gray-400'}`}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Content - Scrollable */}
        <div className="overflow-y-auto flex-1 p-6">
          <form id="edit-product-form" onSubmit={handleSubmit} className="flex flex-col h-full">
            
            {/* ================= STEP 1 ================= */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-lg font-semibold border-b pb-2">Información Básica</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre del Producto</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                    <div className="relative z-[180]">
                      <CategorySelector
                        value={formData.category}
                        onChange={(value) => handleInputChange("category", value)}
                        inModal={true}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 2 ================= */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h3 className="text-lg font-semibold border-b pb-2">Precios e Inventario</h3>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock Actual</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => handleInputChange("stock", e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-1/3"
                      min="0"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <CurrencyInput
                        label="Precio de Compra ($)"
                        value={formData.buyPrice}
                        onChange={(value) => handleInputChange("buyPrice", value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="margin">Margen Minorista (%)</Label>
                      <Input
                        id="margin"
                        type="number"
                        value={formData.margin}
                        onChange={(e) => handleMarginChange(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <CurrencyInput
                        label="Precio de Venta ($)"
                        value={formData.sellPrice}
                        onChange={(value) => handleSalePriceChange(value)}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-dashed">
                    <h4 className="font-semibold text-gray-700 mb-4">Precios Mayoristas</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-start-2 space-y-2">
                        <Label htmlFor="wholesaleMargin">Margen Mayorista (%)</Label>
                        <Input
                          id="wholesaleMargin"
                          type="number"
                          value={formData.wholesaleMargin}
                          onChange={(e) => handleWholesaleMarginChange(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <CurrencyInput
                          label="Precio Mayorista ($)"
                          value={formData.wholesalePrice}
                          onChange={(value) => handleWholesalePriceChange(value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 3 ================= */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                
                <h3 className="text-lg font-semibold border-b pb-2">Imagen Principal</h3>
                <div className="space-y-3">
                  {image && (
                    <div className="relative inline-block">
                      <img src={image} alt="Imagen principal" className="w-32 h-32 object-cover rounded-lg border" />
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
                      onChange={(e) => handleMainImageChange(e.target.files?.[0] || null)}
                      className="max-w-xs"
                    />
                    {uploadedMainImage && <span className="text-sm text-green-600">✓ Seleccionada</span>}
                  </div>
                </div>

                <h3 className="text-lg font-semibold border-b pb-2 pt-4">Galería Extra</h3>
                <ImageUploadSquare
                  images={images}
                  onImagesChange={setImages}
                  uploadedImages={uploadedImages}
                  onUploadedImagesChange={setUploadedImages}
                  onRemoveImage={handleRemoveImage}
                />

                <h3 className="text-lg font-semibold border-b pb-2 pt-4">Atributos y Promociones</h3>
                <DynamicAttributes
                  attributes={attributes}
                  onAttributesChange={setAttributes}
                />

                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg mt-4">
                  <Switch
                    id="hasDiscount-edit"
                    checked={formData.hasDiscount}
                    onCheckedChange={(checked) => handleInputChange("hasDiscount", checked)}
                  />
                  <Label htmlFor="hasDiscount-edit" className="text-sm font-medium">Activar descuento</Label>
                </div>

                {formData.hasDiscount && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 border rounded-lg bg-blue-50">
                    <div>
                      <Label>Descuento (%)</Label>
                      <Input
                        type="number"
                        value={formData.discountPercentage}
                        onChange={(e) => handleInputChange("discountPercentage", e.target.value === "" ? "" : Number(e.target.value))}
                        min="0" max="100"
                      />
                    </div>
                    <div>
                      <Label>Fecha de Inicio</Label>
                      <Input
                        type="date"
                        value={formData.discountStartDate}
                        onChange={(e) => handleInputChange("discountStartDate", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Fecha de Fin</Label>
                      <Input
                        type="date"
                        value={formData.discountEndDate}
                        onChange={(e) => handleInputChange("discountEndDate", e.target.value)}
                        min={formData.discountStartDate}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================= STEP 4 ================= */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h3 className="text-lg font-semibold text-center border-b pb-2">Revisión Final</h3>
                
                <div className="text-center p-6 bg-blue-50 text-blue-800 rounded-lg border border-blue-200">
                  <Save className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                  <p className="font-medium text-lg">Revisa los cambios antes de guardar</p>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg max-w-md mx-auto mt-6">
                  <div>
                    <Label className="font-bold text-base">Producto Público</Label>
                    <p className="text-sm text-gray-500">¿Visible en el catálogo?</p>
                  </div>
                  <Switch
                    checked={formData.published}
                    onCheckedChange={(checked) => handleInputChange("published", checked)}
                  />
                </div>
              </div>
            )}

          </form>
        </div>

        {/* Footer Navigation - Sticky */}
        <div className="px-6 py-4 shrink-0 bg-white border-t flex justify-between items-center">
          <Button 
            type="button"
            variant="outline" 
            onClick={() => step === 1 ? onClose() : setStep(Math.max(1, step - 1))}
            disabled={loading}
          >
            {step === 1 ? "Cancelar" : <><ChevronLeft className="w-4 h-4 mr-2" /> Atrás</>}
          </Button>
          
          {step < totalSteps ? (
            <Button type="button" onClick={() => setStep(Math.min(totalSteps, step + 1))}>
              Siguiente <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button form="edit-product-form" type="submit" className="bg-green-600 hover:bg-green-700 min-w-[120px]" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar Cambios
            </Button>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
};
