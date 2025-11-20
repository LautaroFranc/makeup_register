"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { PublicCheckout } from "@/components/PublicCheckout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChevronLeft,
  ShoppingBag,
  Package,
  Tag,
  Minus,
  Plus,
} from "lucide-react";

interface StoreConfig {
  storeName: string;
  slug: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    cardBackground: string;
    logoUrl?: string;
  };
  settings: {
    showPrices: boolean;
    showStock: boolean;
  };
  paymentMethods: any;
}

interface Product {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  images?: string[];
  sellPrice: string;
  buyPrice?: string;
  stock: number;
  barcode?: string;
  published: boolean;
  attributes?: { [key: string]: string[] };
  category?: {
    _id: string;
    name: string;
    slug: string;
  };
}

export default function PublicProductPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const productId = params.productId as string;

  const [store, setStore] = useState<StoreConfig | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [selectedAttributes, setSelectedAttributes] = useState<{
    [key: string]: string;
  }>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Obtener configuración de la tienda
        const configResponse = await fetch(
          `/api/stores/public/config/${slug}`
        );
        if (!configResponse.ok) {
          throw new Error("Tienda no encontrada");
        }
        const storeData = await configResponse.json();
        setStore(storeData);

        // Obtener producto público
        const productResponse = await fetch(
          `/api/products/public/${productId}`
        );
        if (!productResponse.ok) {
          throw new Error("Producto no encontrado");
        }
        const productData = await productResponse.json();
        setProduct(productData);

        // Establecer imagen inicial
        if (productData.image) {
          setSelectedImage(productData.image);
        } else if (productData.images && productData.images.length > 0) {
          setSelectedImage(productData.images[0]);
        }

        // Aplicar tema
        applyTheme(storeData.theme);
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setLoading(false);
      }
    };

    if (slug && productId) {
      fetchData();
    }
  }, [slug, productId]);

  const applyTheme = (theme: StoreConfig["theme"]) => {
    document.documentElement.style.setProperty(
      "--theme-primary",
      theme.primaryColor
    );
    document.documentElement.style.setProperty(
      "--theme-secondary",
      theme.secondaryColor
    );
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= (product?.stock || 0)) {
      setQuantity(newQuantity);
    }
  };

  const allImages = product
    ? [
        ...(product.image ? [product.image] : []),
        ...(product.images || []),
      ].filter((img, index, self) => self.indexOf(img) === index)
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-4 text-gray-600">Cargando producto...</p>
        </div>
      </div>
    );
  }

  if (!store || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">
            Producto no encontrado
          </h1>
          <p className="text-gray-600 mt-2">
            El producto que buscas no existe o no está disponible
          </p>
          <Button className="mt-4" onClick={() => router.push(`/store/${slug}`)}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver a la tienda
          </Button>
        </div>
      </div>
    );
  }

  if (!product.published) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">
            Producto no disponible
          </h1>
          <p className="text-gray-600 mt-2">
            Este producto no está publicado actualmente
          </p>
          <Button className="mt-4" onClick={() => router.push(`/store/${slug}`)}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver a la tienda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: store.theme.backgroundColor }}
    >
      {/* Header simple */}
      <header
        className="shadow-sm sticky top-0 z-50"
        style={{ backgroundColor: store.theme.cardBackground }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/store/${slug}`}
              className="flex items-center gap-2 hover:opacity-70 transition-opacity"
            >
              <ChevronLeft className="h-5 w-5" />
              {store.theme.logoUrl ? (
                <Image
                  src={store.theme.logoUrl}
                  alt={store.storeName}
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
              ) : (
                <span className="font-bold text-lg">{store.storeName}</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido del Producto */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Galería de Imágenes */}
          <div className="space-y-4">
            {selectedImage ? (
              <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={selectedImage}
                  alt={product.name}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            ) : (
              <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                <Package className="h-24 w-24 text-gray-300" />
              </div>
            )}

            {/* Miniaturas */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {allImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(img)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === img
                        ? "border-blue-500 scale-95"
                        : "border-transparent hover:border-gray-300"
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} - ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Información del Producto */}
          <div className="space-y-6">
            {/* Categoría */}
            {product.category && (
              <Badge variant="secondary">
                <Tag className="h-3 w-3 mr-1" />
                {product.category.name}
              </Badge>
            )}

            {/* Nombre */}
            <div>
              <h1
                className="text-3xl font-bold mb-2"
                style={{ color: store.theme.textColor }}
              >
                {product.name}
              </h1>
              {product.description && (
                <p className="text-gray-600 text-lg">{product.description}</p>
              )}
            </div>

            {/* Precio */}
            {store.settings.showPrices && (
              <div className="py-4 border-y">
                <p className="text-sm text-gray-500 mb-1">Precio</p>
                <p
                  className="text-4xl font-bold"
                  style={{ color: store.theme.primaryColor }}
                >
                  ${parseFloat(product.sellPrice).toFixed(2)}
                </p>
              </div>
            )}

            {/* Stock */}
            {store.settings.showStock && (
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-500" />
                <span
                  className={`font-medium ${
                    product.stock > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {product.stock > 0
                    ? `${product.stock} disponibles`
                    : "Sin stock"}
                </span>
              </div>
            )}

            {/* Atributos dinámicos (colores, tamaños, etc.) */}
            {product.attributes &&
              Object.keys(product.attributes).length > 0 && (
                <div className="space-y-4">
                  {Object.entries(product.attributes).map(
                    ([attrName, values]) => (
                      <div key={attrName}>
                        <Label className="text-sm font-medium capitalize mb-2 block">
                          {attrName}
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {values.map((value) => (
                            <Button
                              key={value}
                              variant={
                                selectedAttributes[attrName] === value
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                setSelectedAttributes({
                                  ...selectedAttributes,
                                  [attrName]: value,
                                })
                              }
                            >
                              {value}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

            {/* Selector de Cantidad */}
            {product.stock > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Cantidad
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-2xl font-semibold w-16 text-center">
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= product.stock}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Código de barras */}
            {product.barcode && (
              <div className="text-sm text-gray-500">
                <p>Código: {product.barcode}</p>
              </div>
            )}

            {/* Componente de Checkout */}
            {product.stock > 0 ? (
              <PublicCheckout
                product={{
                  _id: product._id,
                  name: product.name,
                  sellPrice: product.sellPrice,
                  image: product.image,
                }}
                paymentMethods={store.paymentMethods}
                storeName={store.storeName}
                quantity={quantity}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-red-600 font-medium">
                    Producto sin stock
                  </p>
                  <p className="text-center text-gray-500 text-sm mt-2">
                    Este producto no está disponible en este momento
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Productos Relacionados - Placeholder */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Productos Relacionados</h2>
          <p className="text-gray-500 text-center py-8">
            Próximamente: Productos similares
          </p>
        </div>
      </main>
    </div>
  );
}
