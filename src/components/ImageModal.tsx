"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Loader2,
  Trash2,
} from "lucide-react";

interface ImageModalProps {
  images: string[];
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  productId: string;
  onAddImages?: (newImages: File[]) => void;
  onDeleteImage?: (imageUrl: string) => void;
  isLoading?: boolean;
  isDeleting?: boolean;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  images,
  isOpen,
  onClose,
  productName,
  productId,
  onAddImages,
  onDeleteImage,
  isLoading = false,
  isDeleting = false,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Al borrar la última imagen el índice queda fuera de rango y next/image
  // recibe `undefined`. Lo reacomodamos cuando cambia la lista.
  useEffect(() => {
    if (currentImageIndex > images.length - 1) {
      setCurrentImageIndex(Math.max(0, images.length - 1));
    }
  }, [images.length, currentImageIndex]);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  const handleAddImages = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      onAddImages?.(newFiles);
      // Limpiar el input para permitir seleccionar los mismos archivos otra vez
      e.target.value = "";
    }
  };

  // No retornar null, permitir que el modal se abra incluso sin imágenes

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Imágenes de {productName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-0">
          <div className="relative">
            {/* Imagen principal */}
            <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                  <p className="text-blue-600 font-medium">
                    Subiendo imágenes...
                  </p>
                </div>
              ) : images && images.length > 0 ? (
                <Image
                  src={images[currentImageIndex]}
                  alt={`${productName} - Imagen ${currentImageIndex + 1}`}
                  fill
                  className="object-contain"
                  priority
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full space-y-4 text-gray-500">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Plus className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No hay imágenes
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Este producto aún no tiene imágenes
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Controles de navegación */}
            {images && images.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Contador */}
            {images && images.length > 0 && (
              <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-sm">
                {currentImageIndex + 1} / {images.length}
              </div>
            )}

            {/* Eliminar la imagen que se está viendo */}
            {onDeleteImage && images && images.length > 0 && !isLoading && (
              <button
                type="button"
                onClick={() => onDeleteImage(images[currentImageIndex])}
                disabled={isDeleting}
                className="absolute top-4 left-4 bg-black/50 hover:bg-red-600 text-white px-2 py-1 rounded text-sm flex items-center gap-1 disabled:opacity-50 transition-colors"
                title="Eliminar imagen"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            )}
          </div>

          {/* Miniaturas */}
          {images && images.length > 0 && (
            <div className="mt-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    <button
                      onClick={() => goToImage(index)}
                      className={`block w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        index === currentImageIndex
                          ? "border-blue-500 ring-2 ring-blue-200"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`Miniatura ${index + 1}`}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </button>
                    {onDeleteImage && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteImage(image);
                        }}
                        disabled={isDeleting}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow hover:bg-red-700 disabled:opacity-50 transition-colors"
                        title="Eliminar imagen"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Botón para agregar más imágenes */}
                {onAddImages && (
                  <button
                    onClick={handleAddImages}
                    disabled={isLoading}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed transition-all flex items-center justify-center ${
                      isLoading
                        ? "border-blue-300 bg-blue-50 cursor-not-allowed"
                        : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                    title={
                      isLoading ? "Subiendo imágenes..." : "Agregar imágenes"
                    }
                  >
                    {isLoading ? (
                      <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                    ) : (
                      <Plus className="h-6 w-6 text-gray-400" />
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Botón para agregar imágenes cuando no hay imágenes */}
        {(!images || images.length === 0) && onAddImages && (
          <div className="p-6 pt-0">
            <div className="flex justify-center">
              <Button
                onClick={handleAddImages}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar Imágenes
              </Button>
            </div>
          </div>
        )}

        {/* Input de archivo oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  );
};
