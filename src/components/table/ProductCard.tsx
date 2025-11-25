import React, { useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Trash2,
  BadgeDollarSign,
  Eye,
  Edit,
  Barcode,
  MoreVertical,
  EyeOff,
  Percent,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatToARS } from "@/lib/utils";
import { ImageModal } from "@/components/ImageModal";
import { AttributesModal } from "@/components/AttributesModal";
import { ProductEditModal } from "@/components/ProductEditModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { BarcodeModal } from "@/components/BarcodeModal";
import { DiscountModal } from "@/components/DiscountModal";
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
  barcode: string;
  category: string;
  user: string;
  published: boolean;
  hasDiscount?: boolean;
  discountPercentage?: number;
  discountedPrice?: string;
  discountStartDate?: string;
  discountEndDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ProductCardProps {
  product: Product;
  handleDelete: (_id: string) => void;
  handleOpenSaleModal: (product: string) => void;
  calculateMargin: (buyPrice: number, sellPrice: number) => string;
  onProductUpdate?: (productId: string, updatedProduct: Product) => void;
  onRefresh?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  handleDelete,
  calculateMargin,
  handleOpenSaleModal,
  onProductUpdate,
  onRefresh,
}) => {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isAttributesModalOpen, setIsAttributesModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localImages, setLocalImages] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { toast } = useToast();

  // Inicializar imágenes locales cuando cambie el producto
  React.useEffect(() => {
    const images = [];
    if (product.image) {
      images.push(product.image);
    }
    if (product.images && product.images.length > 0) {
      images.push(...product.images);
    }
    setLocalImages(images);
  }, [product.image, product.images]);

  // Obtener todas las imágenes (usar imágenes locales)
  const getAllImages = () => {
    return localImages;
  };

  const allImages = getAllImages();
  const hasImages = allImages.length > 0;
  const hasAttributes =
    product.attributes && Object.keys(product.attributes).length > 0;

  const handleAddImages = async (newImages: File[]) => {
    setIsUploadingImages(true);
    try {
      // Crear FormData para enviar las imágenes
      const formData = new FormData();
      formData.append("productId", product._id);

      // Agregar cada imagen
      newImages.forEach((image, index) => {
        formData.append(`images`, image);
      });

      // Llamada a la API para actualizar las imágenes del producto
      const token = localStorage.getItem("token");
      const response = await fetch("/api/products/images", {
        method: "PUT",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        // Actualizar las imágenes locales con las nuevas URLs
        const newImageUrls = result.data.images || [];
        setLocalImages(newImageUrls);

        // Notificar al componente padre sobre la actualización
        if (onProductUpdate) {
          onProductUpdate(product._id, result.data);
        }

        toast({
          description: `${newImages.length} imagen(es) agregada(s) exitosamente`,
          variant: "default",
        });
      } else {
        toast({
          description: `Error al agregar imágenes: ${result.error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        description: "Error de conexión al agregar imágenes",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleSaveProduct = useCallback(
    (updatedProduct: any) => {
      // Notificar al componente padre sobre la actualización
      if (onProductUpdate) {
        onProductUpdate(product._id, updatedProduct);
      }
      setIsEditModalOpen(false);
      setIsDropdownOpen(false);
    },
    [onProductUpdate, product._id]
  );

  const handleDeleteClick = useCallback(() => {
    setIsDeleteModalOpen(true);
    setIsDropdownOpen(false);
  }, []);

  const handleEditClick = useCallback(() => {
    setIsEditModalOpen(true);
    setIsDropdownOpen(false);
  }, []);

  const handleBarcodeClick = useCallback(() => {
    setIsBarcodeModalOpen(true);
    setIsDropdownOpen(false);
  }, []);

  const handleImageClick = useCallback(() => {
    setIsImageModalOpen(true);
    setIsDropdownOpen(false);
  }, []);

  const handleDiscountClick = useCallback(() => {
    setIsDiscountModalOpen(true);
    setIsDropdownOpen(false);
  }, []);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await handleDelete(product._id);
      toast({
        description: `Producto "${product.name}" eliminado exitosamente`,
        variant: "default",
      });
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast({
        description: "Error al eliminar el producto",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleVisibility = async (published: boolean) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/products/${product._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ published }),
      });

      const result = await response.json();

      if (result.success) {
        // Actualizar el producto local
        if (onProductUpdate) {
          onProductUpdate(product._id, { ...product, published });
        }

        toast({
          description: `Producto ${
            published ? "publicado" : "oculto"
          } exitosamente`,
          variant: "default",
        });
      } else {
        toast({
          description: `Error al ${
            published ? "publicar" : "ocultar"
          } el producto`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error al cambiar visibilidad:", error);
      toast({
        description: "Error de conexión",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Imagen del producto */}
              {hasImages ? (
                <div className="relative">
                  <Image
                    src={allImages[0]}
                    alt={product.name}
                    width={60}
                    height={60}
                    className="rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setIsImageModalOpen(true)}
                  />
                  {allImages.length > 1 && (
                    <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {allImages.length}
                    </div>
                  )}
                </div>
              ) : (
                <Image
                  src="/placeholder.svg"
                  alt={product.name}
                  width={60}
                  height={60}
                  className="rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setIsImageModalOpen(true)}
                />
              )}
              <div>
                <CardTitle className="text-sm sm:text-base md:text-lg line-clamp-2">
                  {product.name}
                </CardTitle>
                <p className="text-sm text-gray-500">{product.code}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary">
                    {product.category}
                  </Badge>
                  {product.hasDiscount && product.discountPercentage && product.discountPercentage > 0 && (
                    <Badge className="bg-red-500 text-white hover:bg-red-600">
                      <Percent className="h-3 w-3 mr-1" />
                      -{product.discountPercentage}% OFF
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Switch de visibilidad */}
              <div className="flex items-center gap-1">
                <Switch
                  checked={product.published}
                  onCheckedChange={handleToggleVisibility}
                  className="data-[state=checked]:bg-green-600"
                />
                <span className="text-xs text-gray-500">
                  {product.published ? "Visible" : "Oculto"}
                </span>
              </div>

              {/* Menú de acciones */}
              <DropdownMenu
                open={isDropdownOpen}
                onOpenChange={setIsDropdownOpen}
              >
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={handleImageClick}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver imágenes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleEditClick}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar producto
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBarcodeClick}>
                    <Barcode className="h-4 w-4 mr-2" />
                    Ver código de barras
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDiscountClick}
                    className={product.hasDiscount ? "text-blue-600 focus:text-blue-600" : ""}
                  >
                    <Percent className="h-4 w-4 mr-2" />
                    {product.hasDiscount ? "Editar descuento" : "Agregar descuento"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDeleteClick}
                    className="text-red-600 focus:text-red-600"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar producto
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Atributos */}
          {hasAttributes && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Atributos:</h4>
              <div className="flex flex-wrap gap-1">
                {Object.entries(product.attributes || {})
                  .slice(0, 3)
                  .map(([attributeName, values], attributeIndex) => {
                    if (attributeName === "color") {
                      return (
                        <div
                          key={attributeName}
                          className="flex items-center gap-1"
                        >
                          {values.slice(0, 2).map((value, valueIndex) => {
                            try {
                              const colorInfo = JSON.parse(value);
                              return (
                                <div
                                  key={valueIndex}
                                  className="flex items-center gap-1 bg-white border rounded-full px-2 py-1 shadow-sm"
                                >
                                  <div
                                    className="w-3 h-3 rounded-full border border-gray-300"
                                    style={{ backgroundColor: colorInfo.hex }}
                                  />
                                  <span className="text-xs">
                                    {colorInfo.name}
                                  </span>
                                </div>
                              );
                            } catch {
                              return (
                                <span
                                  key={valueIndex}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                                >
                                  {value}
                                </span>
                              );
                            }
                          })}
                        </div>
                      );
                    }
                    return (
                      <span
                        key={attributeName}
                        className={`px-2 py-1 rounded-full text-xs ${
                          attributeIndex % 2 === 0
                            ? "bg-gray-100 text-gray-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {attributeName}: {values.slice(0, 2).join(", ")}
                      </span>
                    );
                  })}
                {Object.keys(product.attributes || {}).length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAttributesModalOpen(true)}
                    className="h-6 w-6 p-0"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Información de precios y stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Precio de Compra</p>
              <p className="font-semibold">
                {formatToARS(parseFloat(product.buyPrice))}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Precio de Venta</p>
              {product.hasDiscount && product.discountPercentage && product.discountPercentage > 0 ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-400 line-through text-sm">
                      {formatToARS(parseFloat(product.sellPrice))}
                    </p>
                    <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded">
                      -{product.discountPercentage}%
                    </span>
                  </div>
                  <p className="font-bold text-blue-600">
                    {formatToARS(parseFloat(product.discountedPrice || product.sellPrice))}
                  </p>
                </div>
              ) : (
                <p className="font-semibold">
                  {formatToARS(parseFloat(product.sellPrice))}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Margen</p>
              <p
                className={`font-semibold ${(() => {
                  const margin = calculateMargin(
                    parseFloat(product.buyPrice),
                    parseFloat(product.sellPrice)
                  );
                  if (margin === "-") return "text-gray-600";
                  const marginNum = Number(margin);
                  return marginNum >= 0 ? "text-green-600" : "text-red-600";
                })()}`}
              >
                {calculateMargin(
                  parseFloat(product.buyPrice),
                  parseFloat(product.sellPrice)
                )}
                %
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Stock</p>
              <p className="font-semibold">{product.stock}</p>
            </div>
          </div>

          {/* Valor total */}
          <div className="pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Valor Total:</span>
              <span className="font-bold text-sm sm:text-base md:text-lg">
                {formatToARS(parseFloat(product.sellPrice) * product.stock)}
              </span>
            </div>
          </div>

          {/* Botón principal de venta */}
          <div className="pt-2">
            <Button
              onClick={() => handleOpenSaleModal(product._id)}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <BadgeDollarSign className="h-4 w-4 mr-2" />
              Vender Producto
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modales */}
      <ImageModal
        images={allImages}
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        productName={product.name}
        productId={product._id}
        onAddImages={handleAddImages}
        isLoading={isUploadingImages}
      />

      <AttributesModal
        attributes={product.attributes || {}}
        isOpen={isAttributesModalOpen}
        onClose={() => setIsAttributesModalOpen(false)}
        productName={product.name}
      />

      <ProductEditModal
        product={product}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveProduct}
        onRefresh={onRefresh}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        productName={product.name}
        isLoading={isDeleting}
      />

      <DiscountModal
        product={product}
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        onRefresh={onRefresh}
      />

      <BarcodeModal
        product={product}
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onProductUpdate={onProductUpdate}
      />
    </>
  );
};

export default ProductCard;
