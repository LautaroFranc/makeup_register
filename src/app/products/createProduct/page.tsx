"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CurrencyInput } from "@/components/CurrencyInput";
import { useFetch } from "@/hooks/useFetch";
import { Product } from "@/interface/product";

const ProductForm = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0); // Precio de compra
  const [margin, setMargin] = useState(0); // Margen (%)
  const [salePrice, setSalePrice] = useState(0); // Precio de venta
  const [stock, setStock] = useState(0);
  const [category, setCategory] = useState("makeup");
  const [image, setImage] = useState<File | null>(null);
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
    console.log(newSalePrice);

    setSalePrice(newSalePrice);
    const newMargin = ((newSalePrice - price) / price) * 100;
    setMargin(Number(newMargin.toFixed(2)));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
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
      setCategory("makeup");
      setImage(null);
      setStock(0);
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
    formData.append("category", category);
    formData.append("stock", stock + "");
    if (image) {
      formData.append("image", image);
    }
    fetchData("http://localhost:3000/api/products", {
      method: "POST",
      body: formData,
    });
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white shadow-md rounded-md">
      <h2 className="text-xl font-semibold mb-4">Crear Producto</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre */}
        <div>
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del producto"
            required
          />
        </div>

        {/* Descripción */}
        <div>
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción del producto"
            required
          />
        </div>

        {/* Precio de compra */}
        <div>
          <CurrencyInput
            label="Precio original ($)"
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
            min="0"
            step="10"
          />
        </div>

        {/* Precio de venta */}
        <div>
          <CurrencyInput
            label="Precio de reventa ($)"
            value={salePrice}
            onChange={(value) => handleSalePriceChange(value)}
          />
        </div>

        {/* STOCK  */}
        <div>
          <Label htmlFor="stock">Stock</Label>
          <Input
            id="stock"
            type="number"
            value={stock}
            onChange={(e) => setStock(Number(e.target.value))}
            placeholder="Stock"
            required
            min="0"
            step="1"
          />
        </div>
        {/* Categoría */}
        <div>
          <Label htmlFor="category">Categoría</Label>
          <Select
            value={category}
            onValueChange={(value) => setCategory(value)}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Seleccionar categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="makeup">Maquillaje</SelectItem>
              <SelectItem value="jewel">Joya</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Subir Imagen */}
        <div>
          <Label htmlFor="image">Imagen</Label>
          <Input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
          {image && (
            <p className="text-sm text-gray-600 mt-2">
              Imagen seleccionada: {image.name}
            </p>
          )}
        </div>

        {/* Botón */}
        <Button type="submit" disabled={loading} className="w-full" >
          {loading ? "Cargando..." : "Crear Producto"}
        </Button>
      </form>
    </div>
  );
};

export default ProductForm;
