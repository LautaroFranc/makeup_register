"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Upload } from "lucide-react";
import Image from "next/image";

interface MultiImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  uploadedImages: File[];
  onUploadedImagesChange: (images: File[]) => void;
}

export const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  images,
  onImagesChange,
  uploadedImages,
  onUploadedImagesChange,
}) => {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

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
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      <Label>Imágenes del Producto</Label>

      {/* Imágenes existentes */}
      {images.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Imágenes existentes:</p>
          <div className="flex flex-wrap gap-2">
            {images.map((image, index) => (
              <div key={index} className="relative">
                <Image
                  src={image}
                  alt={`Imagen ${index + 1}`}
                  width={80}
                  height={80}
                  className="rounded-md object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  onClick={() => removeExistingImage(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nuevas imágenes subidas */}
      {previewUrls.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Nuevas imágenes:</p>
          <div className="flex flex-wrap gap-2">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative">
                <Image
                  src={url}
                  alt={`Preview ${index + 1}`}
                  width={80}
                  height={80}
                  className="rounded-md object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input para subir nuevas imágenes */}
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            (
              document.querySelector('input[type="file"]') as HTMLInputElement
            )?.click()
          }
        >
          <Upload className="h-4 w-4 mr-2" />
          Subir
        </Button>
      </div>

      <p className="text-xs text-gray-500">
        Puedes subir múltiples imágenes a la vez. Máximo 5MB por imagen.
      </p>
    </div>
  );
};
