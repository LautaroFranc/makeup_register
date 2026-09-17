"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CurrencyInput } from "@/components/CurrencyInput";
import { useFetch } from "@/hooks/useFetch";
import { Product } from "@/interface/product";
import { CategorySelector } from "@/components/CategorySelect";
import { ImageUploadSquare } from "@/components/ImageUploadSquare";
import { DynamicAttributes } from "@/components/DynamicAttributes";
import { StorePreviewButton } from "@/components/StorePreviewButton";
import { Check, ChevronRight, ChevronLeft, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ProductForm = () => {
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const steps = [
    { num: 1, title: "Básicos" },
    { num: 2, title: "Precios" },
    { num: 3, title: "Detalles" },
    { num: 4, title: "Revisión" }
  ];

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0); // Precio de compra
  const [margin, setMargin] = useState<number | string>(0); // Margen (%)
  const [salePrice, setSalePrice] = useState(0); // Precio de venta
  const [wholesalePrice, setWholesalePrice] = useState(0); // Precio mayorista
  const [wholesaleMargin, setWholesaleMargin] = useState<number | string>(0); // Margen mayorista (%)
  const [stock, setStock] = useState<number | string>(0);
  const [category, setCategory] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [attributes, setAttributes] = useState<{ [key: string]: string[] }>({});
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState<number | string>(0);
  const [discountStartDate, setDiscountStartDate] = useState("");
  const [discountEndDate, setDiscountEndDate] = useState("");
  const [published, setPublished] = useState(true);
  
  const { toast } = useToast();
  const { data, error, loading, fetchData } = useFetch<Product[]>();

  // Actualiza el margen y el precio de venta automáticamente
  const handleMarginChange = (newMargin: number | string) => {
    setMargin(newMargin);
    if (newMargin === "") return;
    const numericMargin = Number(newMargin);
    const newSalePrice = price + (price * numericMargin) / 100;
    setSalePrice(Number(newSalePrice.toFixed(2)));
  };

  // Actualiza el precio de venta y recalcula el margen automáticamente
  const handleSalePriceChange = (newSalePrice: number) => {
    setSalePrice(newSalePrice);
    const newMargin = price ? ((newSalePrice - price) / price) * 100 : 0;
    setMargin(Number(newMargin.toFixed(2)));
  };

  // Actualiza el margen y el precio mayorista automáticamente
  const handleWholesaleMarginChange = (newMargin: number | string) => {
    setWholesaleMargin(newMargin);
    if (newMargin === "") return;
    const numericMargin = Number(newMargin);
    const newWholesalePrice = price + (price * numericMargin) / 100;
    setWholesalePrice(Number(newWholesalePrice.toFixed(2)));
  };

  // Actualiza el precio mayorista y recalcula el margen automáticamente
  const handleWholesalePriceChange = (newWholesalePrice: number) => {
    setWholesalePrice(newWholesalePrice);
    const newMargin = price ? ((newWholesalePrice - price) / price) * 100 : 0;
    setWholesaleMargin(Number(newMargin.toFixed(2)));
  };

  useEffect(() => {
    if (data) {
      toast({
        description: "Producto creado exitosamente!",
        variant: "default",
      });
      // Reset form
      setStep(1);
      setName("");
      setDescription("");
      setPrice(0);
      setMargin(0);
      setSalePrice(0);
      setWholesaleMargin(0);
      setWholesalePrice(0);
      setCategory("");
      setStock(0);
      setImages([]);
      setUploadedImages([]);
      setAttributes({});
      setHasDiscount(false);
      setDiscountPercentage(0);
      setDiscountStartDate("");
      setDiscountEndDate("");
      setPublished(true);
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      toast({
        description: error,
        variant: "destructive",
      });
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("buyPrice", price + "");
    formData.append("margin", margin === "" ? "0" : margin + "");
    formData.append("sellPrice", salePrice + "");
    formData.append("wholesalePrice", wholesalePrice + "");
    formData.append("stock", stock === "" ? "0" : stock + "");
    formData.append("category", category + "");
    formData.append("attributes", JSON.stringify(attributes));
    formData.append("hasDiscount", hasDiscount + "");
    formData.append("discountPercentage", discountPercentage === "" ? "0" : discountPercentage + "");
    formData.append("published", published + "");
    if (discountStartDate) formData.append("discountStartDate", discountStartDate);
    if (discountEndDate) formData.append("discountEndDate", discountEndDate);

    // Agregar múltiples imágenes
    uploadedImages.forEach((img) => {
      formData.append(`images`, img);
    });
    const token = localStorage.getItem("token");
    fetchData("/api/products", {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-md animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold">Crear Nuevo Producto</h2>
        <p className="text-gray-500">Completa la información del producto paso a paso.</p>
      </div>

      {/* Progress Bar / Steps */}
      <div className="flex items-center justify-between mb-8 relative max-w-2xl mx-auto">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-10 rounded"></div>
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 -z-10 rounded transition-all duration-300"
          style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
        ></div>
        
        {steps.map((s) => (
          <div key={s.num} className="flex flex-col items-center gap-2 bg-white px-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors
              ${step === s.num ? 'border-blue-600 bg-blue-600 text-white' : 
                step > s.num ? 'border-blue-600 bg-white text-blue-600' : 'border-gray-300 bg-white text-gray-400'}`}>
              {step > s.num ? <Check className="w-5 h-5" /> : s.num}
            </div>
            <span className={`text-xs font-medium ${step >= s.num ? 'text-gray-900' : 'text-gray-400'}`}>
              {s.title}
            </span>
          </div>
        ))}
      </div>

      <Card className="shadow-lg border-0 shadow-gray-200">
        <CardContent className="p-8 min-h-[400px] flex flex-col">
          <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
            
            <div className="flex-grow">
              {/* ================= STEP 1 ================= */}
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in">
                  <h3 className="text-xl font-bold border-b pb-2">Información Básica</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre del Producto *</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej. Base de Maquillaje Líquida"
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Categoría principal *</Label>
                      <CategorySelector value={category} onChange={setCategory} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Cuéntale a tus clientes sobre este producto"
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ================= STEP 2 ================= */}
              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <h3 className="text-xl font-bold border-b pb-2">Precios e Inventario</h3>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="stock">Stock Actual *</Label>
                      <Input
                        id="stock"
                        type="number"
                        value={stock}
                        onChange={(e) => setStock(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="0"
                        className="w-1/3"
                        min="0"
                      />
                    </div>

                    <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <CurrencyInput
                            label="Precio de Compra ($)"
                            value={price}
                            onChange={(value) => setPrice(value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="margin">Margen Minorista (%)</Label>
                          <Input
                            id="margin"
                            type="number"
                            value={margin}
                            onChange={(e) => handleMarginChange(e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder="50"
                            disabled={!Boolean(price)}
                          />
                        </div>
                        <div>
                          <CurrencyInput
                            label="Precio de Venta ($)"
                            value={salePrice}
                            onChange={(value) => handleSalePriceChange(value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg space-y-4 border-dashed">
                      <Label className="font-semibold text-gray-700">Precios para Mayoristas</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-start-2 space-y-2">
                          <Label htmlFor="wholesaleMargin">Margen Mayorista (%)</Label>
                          <Input
                            id="wholesaleMargin"
                            type="number"
                            value={wholesaleMargin}
                            onChange={(e) => handleWholesaleMarginChange(e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder="20"
                            disabled={!Boolean(price)}
                          />
                        </div>
                        <div>
                          <CurrencyInput
                            label="Precio Mayorista ($)"
                            value={wholesalePrice}
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
                  <h3 className="text-xl font-bold border-b pb-2">Imágenes y Promociones</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Galería de Imágenes</Label>
                      <ImageUploadSquare
                        images={images}
                        onImagesChange={setImages}
                        uploadedImages={uploadedImages}
                        onUploadedImagesChange={setUploadedImages}
                      />
                    </div>

                    <div className="pt-4">
                      <Label className="mb-2 block font-semibold text-gray-700">Atributos Dinámicos</Label>
                      <div className="p-4 border rounded-lg bg-gray-50">
                        <DynamicAttributes
                          attributes={attributes}
                          onAttributesChange={setAttributes}
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <div className="flex items-center space-x-3 p-4 border rounded-lg bg-blue-50">
                        <Switch
                          id="hasDiscount"
                          checked={hasDiscount}
                          onCheckedChange={setHasDiscount}
                        />
                        <Label htmlFor="hasDiscount" className="text-sm font-medium cursor-pointer">
                          Activar promoción o descuento en este producto
                        </Label>
                      </div>

                      {hasDiscount && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6 p-4 border rounded-lg">
                          <div>
                            <Label htmlFor="discountPercentage">Descuento (%)</Label>
                            <Input
                              id="discountPercentage"
                              type="number"
                              value={discountPercentage}
                              onChange={(e) => setDiscountPercentage(e.target.value === "" ? "" : Number(e.target.value))}
                              min="0"
                              max="100"
                            />
                          </div>
                          <div>
                            <Label htmlFor="discountStartDate">Fecha Inicio</Label>
                            <Input
                              id="discountStartDate"
                              type="date"
                              value={discountStartDate}
                              onChange={(e) => setDiscountStartDate(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="discountEndDate">Fecha Fin</Label>
                            <Input
                              id="discountEndDate"
                              type="date"
                              value={discountEndDate}
                              onChange={(e) => setDiscountEndDate(e.target.value)}
                              min={discountStartDate}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ================= STEP 4 ================= */}
              {step === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <h3 className="text-xl font-bold text-center border-b pb-2">Revisión Final</h3>
                  
                  <div className="text-center p-6 bg-green-50 text-green-800 rounded-lg border border-green-200">
                    <Check className="w-12 h-12 mx-auto mb-4 text-green-600" />
                    <p className="font-medium text-lg">El producto está listo para crearse</p>
                    <p className="text-sm text-green-700 mt-2">Haz clic en Guardar para publicarlo en el sistema.</p>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg max-w-md mx-auto mt-6">
                    <div>
                      <Label className="font-bold text-base">Producto Público</Label>
                      <p className="text-sm text-gray-500">¿Visible para los clientes?</p>
                    </div>
                    <Switch 
                      checked={published} 
                      onCheckedChange={setPublished} 
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Navegación de Pasos */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1 || loading}
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Atrás
              </Button>
              
              {step < totalSteps ? (
                <Button type="button" onClick={() => setStep(Math.min(totalSteps, step + 1))}>
                  Siguiente <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={loading}>
                  {loading ? "Guardando..." : (
                    <>
                      <Save className="w-4 h-4 mr-2" /> Crear Producto
                    </>
                  )}
                </Button>
              )}
            </div>

          </form>
        </CardContent>
      </Card>

      <StorePreviewButton />
    </div>
  );
};

export default ProductForm;
