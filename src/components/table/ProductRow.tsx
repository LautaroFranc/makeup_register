import { TableRow, TableCell } from "@/components/ui/table";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Trash2, BadgeDollarSign, Eye, Edit, Barcode } from "lucide-react";
import { formatToARS } from "@/lib/utils";
import { ImageModal } from "@/components/ImageModal";
import { AttributesModal } from "@/components/AttributesModal";
import { ProductEditModal } from "@/components/ProductEditModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { BarcodeModal } from "@/components/BarcodeModal";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  _id: string;
  name: string;
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
}

interface EditingCell {
  _id: string;
  field: string;
}

interface ProductRowProps {
  product: Product;
  handleDelete: (_id: string) => void;
  handleOpenSaleModal: (product: string) => void;
  calculateMargin: (buyPrice: number, sellPrice: number) => string;
  onProductUpdate?: (productId: string, updatedProduct: Product) => void;
  onRefresh?: () => void;
}

const ProductRow: React.FC<ProductRowProps> = ({
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
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localImages, setLocalImages] = useState<string[]>([]);
  const { toast } = useToast();

  // Inicializar imágenes locales cuando cambie el producto
  useEffect(() => {
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
      console.log("Agregando imágenes al producto:", product._id, newImages);

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
      console.error("Error al agregar imágenes:", error);
      toast({
        description: "Error de conexión al agregar imágenes",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleSaveProduct = (updatedProduct: any) => {
    // Notificar al componente padre sobre la actualización
    if (onProductUpdate) {
      onProductUpdate(product._id, updatedProduct);
    }
    setIsEditModalOpen(false);
  };

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

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
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          {/* Imagen principal */}
          {product.image && (
            <Image
              src={product.image}
              alt={product.name}
              width={35}
              height={35}
              className="rounded-md object-cover cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setIsImageModalOpen(true)}
            />
          )}
          {/* Imágenes adicionales */}
          {product.images && product.images.length > 0 && (
            <div className="flex gap-1">
              {product.images.slice(0, 1).map((img, index) => (
                <Image
                  key={index}
                  src={img}
                  alt={`${product.name} ${index + 1}`}
                  width={35}
                  height={35}
                  className="rounded-md object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setIsImageModalOpen(true)}
                />
              ))}
            </div>
          )}
          {!product.image &&
            (!product.images || product.images.length === 0) && (
              <Image
                src="/placeholder.svg"
                alt={product.name}
                width={35}
                height={35}
                className="rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setIsImageModalOpen(true)}
              />
            )}

          {/* Botón para ver/agregar imágenes */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsImageModalOpen(true)}
            className="h-6 w-6 p-0"
            title={hasImages ? "Ver imágenes" : "Agregar imágenes"}
          >
            <Eye className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-blue-600">{product.code}</span>
      </TableCell>
      <TableCell>
        <span className="font-medium">{product.name}</span>
      </TableCell>
      <TableCell>
        <span className="text-gray-600">{product.category}</span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {hasAttributes ? (
            <>
              {/* Mostrar solo los primeros 2 atributos como preview */}
              <div className="flex flex-wrap gap-1">
                {Object.entries(product.attributes || {})
                  .slice(0, 2)
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
                          {values.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{values.length - 2}
                            </span>
                          )}
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
                        {values.length > 2 && ` +${values.length - 2}`}
                      </span>
                    );
                  })}
                {Object.keys(product.attributes || {}).length > 2 && (
                  <span className="text-xs text-gray-500">
                    +{Object.keys(product.attributes || {}).length - 2} más
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAttributesModalOpen(true)}
                className="h-6 w-6 p-0"
              >
                <Eye className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <span className="text-gray-400 text-sm">Sin atributos</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <span className="font-medium">
          {formatToARS(parseFloat(product.buyPrice))}
        </span>
      </TableCell>
      <TableCell>
        <span className="font-medium">
          {formatToARS(parseFloat(product.sellPrice))}
        </span>
      </TableCell>
      <TableCell>
        <span
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium
    ${(() => {
      const margin = calculateMargin(
        parseFloat(product.buyPrice),
        parseFloat(product.sellPrice)
      );
      if (margin === "-") return "bg-gray-100 text-gray-700";
      const marginNum = Number(margin);
      return marginNum >= 0
        ? "bg-green-100 text-green-700"
        : "bg-red-100 text-red-700";
    })()}`}
        >
          {calculateMargin(
            parseFloat(product.buyPrice),
            parseFloat(product.sellPrice)
          )}
          %
        </span>
      </TableCell>
      <TableCell>
        <span className="font-medium">{product.stock}</span>
      </TableCell>
      <TableCell>
        {formatToARS(parseFloat(product.sellPrice) * product.stock)}
      </TableCell>
      <TableCell>
        <div className="flex gap-2 justify-end">
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={handleDeleteClick}
            title="Eliminar producto"
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsBarcodeModalOpen(true)}
            title="Ver código de barras"
          >
            <Barcode className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => handleOpenSaleModal(product._id)}
            title="Vender producto"
            size="sm"
          >
            <BadgeDollarSign className="h-4 w-4 mr-1" />
            Vender
          </Button>
        </div>
      </TableCell>

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

      <BarcodeModal
        product={product}
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onProductUpdate={onProductUpdate}
      />
    </TableRow>
  );
};

export default ProductRow;
