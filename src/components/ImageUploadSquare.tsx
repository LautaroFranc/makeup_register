"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import Image from "next/image";

interface ImageUploadSquareProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  uploadedImages: File[];
  onUploadedImagesChange: (images: File[]) => void;
  onRemoveImage?: (imageUrl: string) => void;
}

export const ImageUploadSquare: React.FC<ImageUploadSquareProps> = ({
  images,
  onImagesChange,
  uploadedImages,
  onUploadedImagesChange,
  onRemoveImage,
}) => {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Limpiar preview URLs cuando uploadedImages se vacía (formulario reseteado)
  useEffect(() => {
    if (uploadedImages.length === 0 && previewUrls.length > 0) {
      // Limpiar las URLs de preview para liberar memoria
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setPreviewUrls([]);
    }
  }, [uploadedImages.length]);

  // Limpiar URLs cuando el componente se desmonta
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const newUrls = newFiles.map((file) => URL.createObjectURL(file));

      onUploadedImagesChange([...uploadedImages, ...newFiles]);
      setPreviewUrls([...previewUrls, ...newUrls]);
    }
  };

  const removeImage = (index: number) => {
    const newFiles = uploadedImages.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);

    onUploadedImagesChange(newFiles);
    setPreviewUrls(newUrls);
  };

  const removeExistingImage = (index: number) => {
    const imageUrl = images[index];
    if (onRemoveImage) {
      // Si hay función de eliminación personalizada, usarla
      onRemoveImage(imageUrl);
    } else {
      // Comportamiento por defecto
      const newImages = images.filter((_, i) => i !== index);
      onImagesChange(newImages);
    }
  };

  const getAllImages = () => {
    const existingImages = images.map((img, index) => ({
      url: img,
      type: "existing",
      index,
    }));
    const newImages = previewUrls.map((url, index) => ({
      url,
      type: "new",
      index,
    }));
    return [...existingImages, ...newImages];
  };

  const allImages = getAllImages();
  const hasImages = allImages.length > 0;

  return (
    <div className="space-y-4">
      <Label>Imágenes del Producto</Label>

      <div className="space-y-4">
        {/* Cuadrado de carga */}
        <div className="relative inline-block">
          <div
            className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="h-8 w-8 text-gray-400" />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Lista de todas las imágenes (miniaturas) */}
      {hasImages && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Imágenes seleccionadas:</p>
          <div className="flex flex-wrap gap-2">
            {allImages.map((image, index) => (
              <div
                key={index}
                className="relative w-12 h-12 rounded border-2 border-gray-200 hover:border-gray-400 transition-all"
              >
                <Image
                  src={image.url}
                  alt={`Miniatura ${index + 1}`}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover rounded"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0"
                  onClick={() => {
                    if (image.type === "existing") {
                      removeExistingImage(image.index);
                    } else {
                      removeImage(image.index);
                    }
                  }}
                >
                  <X className="h-2 w-2" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Información adicional */}
      <p className="text-xs text-gray-500">
        Haz clic en el cuadrado con "+" para agregar imágenes. Máximo 5MB por
        imagen.
      </p>
    </div>
  );
};
