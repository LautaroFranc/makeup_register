"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Monitor, Smartphone } from "lucide-react";

interface Store {
  _id: string;
  name: string;
  slug: string;
  customUrl?: string;
}

export function StorePreviewButton() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [storeConfig, setStoreConfig] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Cargar tiendas del usuario
  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const response = await fetch("/api/stores", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setStores(data.stores);
          // Seleccionar la primera tienda por defecto
          if (data.stores.length > 0) {
            setSelectedStore(data.stores[0]);
          }
        }
      } catch (error) {
        console.error("Error loading stores:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  // Cargar configuración de la tienda seleccionada cuando se abre el modal
  useEffect(() => {
    const fetchStoreConfig = async () => {
      if (!selectedStore || !isPreviewOpen) return;

      try {
        setLoadingConfig(true);
        const response = await fetch(`/api/stores/public/config/${selectedStore.slug}`);

        if (response.ok) {
          const config = await response.json();
          setStoreConfig(config);
        }
      } catch (error) {
        console.error("Error loading store config:", error);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchStoreConfig();
  }, [selectedStore, isPreviewOpen]);

  const handleOpenPreview = () => {
    if (selectedStore) {
      setIsPreviewOpen(true);
    }
  };

  if (stores.length === 0 && !loading) {
    return null; // No mostrar el botón si no hay tiendas
  }

  return (
    <>
      {/* Botón Flotante */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end">
        {/* Selector de tienda (aparece cuando hay múltiples tiendas) */}
        {stores.length > 1 && (
          <div className="bg-white rounded-lg shadow-lg p-3 border">
            <Select
              value={selectedStore?._id}
              onValueChange={(value) => {
                const store = stores.find((s) => s._id === value);
                if (store) setSelectedStore(store);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleccionar tienda" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store._id} value={store._id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Botón principal */}
        <Button
          size="lg"
          onClick={handleOpenPreview}
          disabled={!selectedStore}
          className="h-14 w-14 rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-110"
        >
          <Eye className="h-6 w-6" />
        </Button>
      </div>

      {/* Modal de Vista Previa */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5" />
                <span>Vista Previa: {selectedStore?.name}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "desktop" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("desktop")}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Desktop
                </Button>
                <Button
                  variant={viewMode === "mobile" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("mobile")}
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6 overflow-hidden min-h-0">
            {loadingConfig ? (
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-gray-600">Cargando vista previa...</p>
              </div>
            ) : storeConfig?.customUrl ? (
              <>
                {viewMode === "desktop" ? (
                  <iframe
                    src={storeConfig.customUrl}
                    className="w-full h-full border-2 border-gray-300 rounded-xl shadow-2xl bg-white"
                    title={`Vista previa de ${selectedStore?.name}`}
                  />
                ) : (
                  <div className="relative">
                    {/* Mockup de iPhone */}
                    <div className="w-[390px] h-[844px] bg-black rounded-[50px] p-3 shadow-2xl border-[14px] border-black relative">
                      {/* Notch */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-black rounded-b-3xl z-10"></div>

                      {/* Pantalla */}
                      <iframe
                        src={storeConfig.customUrl}
                        className="w-full h-full rounded-[35px] bg-white"
                        title={`Vista previa móvil de ${selectedStore?.name}`}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="text-gray-400">
                  <Eye className="h-16 w-16 mx-auto mb-4" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700">
                  URL Personalizada No Configurada
                </h3>
                <p className="text-gray-500 max-w-md">
                  Esta tienda no tiene una URL personalizada configurada. Por favor,
                  edita la tienda y agrega una URL en la sección de configuración básica.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
