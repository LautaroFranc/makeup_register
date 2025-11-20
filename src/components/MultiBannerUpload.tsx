"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Upload, GripVertical } from "lucide-react";
import Image from "next/image";

interface MultiBannerUploadProps {
  bannerUrls: string[];
  onBannerUrlsChange: (urls: string[]) => void;
  maxBanners?: number;
}

export const MultiBannerUpload: React.FC<MultiBannerUploadProps> = ({
  bannerUrls,
  onBannerUrlsChange,
  maxBanners = 5,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);

      // Validar límite de banners
      if (bannerUrls.length + files.length > maxBanners) {
        alert(`Solo puedes subir un máximo de ${maxBanners} banners`);
        return;
      }

      setUploading(true);

      try {
        const uploadedUrls: string[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileName = file.name;

          // Validar tamaño (5MB)
          if (file.size > 5 * 1024 * 1024) {
            alert(`${fileName} excede el tamaño máximo de 5MB`);
            continue;
          }

          const formData = new FormData();
          formData.append("file", file);

          const xhr = new XMLHttpRequest();

          // Crear promesa para manejar el upload
          const uploadPromise = new Promise<string>((resolve, reject) => {
            xhr.upload.addEventListener("progress", (e) => {
              if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                setUploadProgress((prev) => ({
                  ...prev,
                  [fileName]: percentComplete,
                }));
              }
            });

            xhr.addEventListener("load", () => {
              if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.url) {
                  resolve(response.url);
                } else {
                  reject(new Error("No se recibió URL de la imagen"));
                }
              } else {
                reject(new Error(`Error ${xhr.status}: ${xhr.statusText}`));
              }
            });

            xhr.addEventListener("error", () => {
              reject(new Error("Error al subir la imagen"));
            });

            xhr.open("POST", "/api/upload-image");
            xhr.send(formData);
          });

          try {
            const url = await uploadPromise;
            uploadedUrls.push(url);
            setUploadProgress((prev) => {
              const newProgress = { ...prev };
              delete newProgress[fileName];
              return newProgress;
            });
          } catch (error) {
            console.error(`Error al subir ${fileName}:`, error);
            alert(`Error al subir ${fileName}`);
          }
        }

        // Agregar las URLs subidas
        if (uploadedUrls.length > 0) {
          onBannerUrlsChange([...bannerUrls, ...uploadedUrls]);
        }
      } catch (error) {
        console.error("Error en el proceso de upload:", error);
        alert("Error al subir las imágenes");
      } finally {
        setUploading(false);
        // Limpiar el input
        e.target.value = "";
      }
    }
  };

  const removeBanner = (index: number) => {
    const newBanners = bannerUrls.filter((_, i) => i !== index);
    onBannerUrlsChange(newBanners);
  };

  const moveBanner = (fromIndex: number, toIndex: number) => {
    const newBanners = [...bannerUrls];
    const [movedBanner] = newBanners.splice(fromIndex, 1);
    newBanners.splice(toIndex, 0, movedBanner);
    onBannerUrlsChange(newBanners);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Banners de la Tienda (Slider)</Label>
        <span className="text-xs text-gray-500">
          {bannerUrls.length}/{maxBanners}
        </span>
      </div>

      {/* Banners existentes con reordenamiento */}
      {bannerUrls.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Arrastra para reordenar (el primero se muestra por defecto):
          </p>
          <div className="grid grid-cols-1 gap-3">
            {bannerUrls.map((url, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border rounded-lg bg-white"
              >
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    disabled={index === 0}
                    onClick={() => moveBanner(index, index - 1)}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    disabled={index === bannerUrls.length - 1}
                    onClick={() => moveBanner(index, index + 1)}
                  >
                    ↓
                  </Button>
                </div>

                <div className="flex-shrink-0">
                  <Image
                    src={url}
                    alt={`Banner ${index + 1}`}
                    width={200}
                    height={80}
                    className="rounded-md object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Banner {index + 1}</p>
                  {index === 0 && (
                    <span className="text-xs text-blue-600">
                      Principal (por defecto)
                    </span>
                  )}
                </div>

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeBanner(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progreso de upload */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Subiendo imágenes:</p>
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="truncate">{fileName}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input para subir nuevos banners */}
      {bannerUrls.length < maxBanners && (
        <div className="space-y-2">
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
            id="banner-upload"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => document.getElementById("banner-upload")?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Subiendo..." : "Agregar Banners"}
          </Button>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Recomendación: Usa imágenes con proporción 16:9 (1920x1080px) para mejor
        resultado. Máximo {maxBanners} banners, 5MB por imagen.
      </p>
    </div>
  );
};
