"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CurrencyInput } from "@/components/CurrencyInput";
import { useFetch } from "@/hooks/useFetch";
import { Product } from "@/interface/product";
import { CategorySelector } from "@/components/CategorySelect";
import { ImageUploadSquare } from "@/components/ImageUploadSquare";
import { DynamicAttributes } from "@/components/DynamicAttributes";

const ProductForm = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0); // Precio de compra
  const [margin, setMargin] = useState(0); // Margen (%)
  const [salePrice, setSalePrice] = useState(0); // Precio de venta
  const [stock, setStock] = useState(0);
  const [category, setCategory] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [attributes, setAttributes] = useState<{ [key: string]: string[] }>({});
  const { toast } = useToast();
  const { data, error, loading, fetchData } = useFetch<Product[]>();

  // Actualiza el margen y el precio de venta automáticamente
  const handleMarginChange = (newMargin: number) => {
    setMargin(newMargin);
    const newSalePrice = price + (price * newMargin) / 100;

    setSalePrice(Number(newSalePrice.toFixed(2)));
  };
  // Actualiza el precio de venta y recalcula el margen automáticamente
  const handleSalePriceChange = (newSalePrice: number) => {
    setSalePrice(newSalePrice);
    const newMargin = ((newSalePrice - price) / price) * 100;
    setMargin(Number(newMargin.toFixed(2)));
  };

  useEffect(() => {
    if (data) {
      toast({
        description: "Producto creado exitosamente!",
        variant: "default",
      });
      setName("");
      setDescription("");
      setPrice(0);
      setMargin(0);
      setSalePrice(0);
      setCategory("");
      setStock(0);
      setImages([]);
      setUploadedImages([]);
      setAttributes({});
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
    formData.append("margin", margin + "");
    formData.append("sellPrice", salePrice + "");
    formData.append("stock", stock + "");
    formData.append("category", category + "");
    formData.append("attributes", JSON.stringify(attributes));

    // Agregar múltiples imágenes
    uploadedImages.forEach((img, index) => {
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
    <div className="max-w-6xl mx-auto p-6 bg-white shadow-md rounded-md">
      <h2 className="text-2xl font-semibold mb-6 text-center">
        Crear Producto
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del producto"
                required
              />
            </div>

            {/* Descripción */}
            <div className="md:col-span-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción del producto"
                required
                rows={3}
              />
            </div>

            {/* Categoría */}
            <div>
              <Label htmlFor="category">Categoría</Label>
              <CategorySelector value={category} onChange={setCategory} />
            </div>

            {/* Stock */}
            <div>
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
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
                value={price}
                onChange={(value) => {
                  setPrice(value);
                }}
              />
            </div>

            {/* Margen */}
            <div>
              <Label htmlFor="margin">Margen (%)</Label>
              <Input
                id="margin"
                type="number"
                value={margin}
                onChange={(e) => handleMarginChange(Number(e.target.value))}
                placeholder="Margen (%)"
                required
                disabled={!Boolean(price)}
              />
            </div>

            {/* Precio de venta */}
            <div>
              <CurrencyInput
                label="Precio de Venta ($)"
                value={salePrice}
                onChange={(value) => handleSalePriceChange(value)}
              />
            </div>
          </div>
        </div>

        {/* Imágenes */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
            Imágenes del Producto
          </h3>
          <ImageUploadSquare
            images={images}
            onImagesChange={setImages}
            uploadedImages={uploadedImages}
            onUploadedImagesChange={setUploadedImages}
          />
        </div>

        {/* Atributos Dinámicos */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
            Atributos del Producto
          </h3>
          <div>
            <DynamicAttributes
              attributes={attributes}
              onAttributesChange={setAttributes}
            />
          </div>
        </div>

        {/* Botón */}
        <div className="flex justify-center pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="px-8 py-3 text-lg font-medium min-w-[200px]"
          >
            {loading ? "Cargando..." : "Crear Producto"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
