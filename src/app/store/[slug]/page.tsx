"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface StoreConfig {
  customUrl?: string;
}

export default function PublicStorePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [store, setStore] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        const configResponse = await fetch(`/api/stores/public/config/${slug}`);
        if (!configResponse.ok) throw new Error("Tienda no encontrada");

        const storeData = await configResponse.json();
        setStore(storeData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Cargando vista previa...</p>
      </div>
    );
  }

  if (!store?.customUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>No se puede cargar la vista previa.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col items-center py-6">
      {/* Selector de vista */}
      <div className="mb-4 flex gap-4">
        <button
          onClick={() => setViewMode("desktop")}
          className={`px-4 py-2 rounded ${
            viewMode === "desktop" ? "bg-blue-600 text-white" : "bg-white"
          }`}
        >
          Desktop
        </button>

        <button
          onClick={() => setViewMode("mobile")}
          className={`px-4 py-2 rounded ${
            viewMode === "mobile" ? "bg-blue-600 text-white" : "bg-white"
          }`}
        >
          Mobile
        </button>
      </div>

      {/* Contenedor responsive */}
      {viewMode === "desktop" ? (
        //  🌐 MODO DESKTOP (pantalla completa)
        <iframe
          src={store.customUrl}
          className="w-full h-[90vh] border rounded-lg shadow-lg"
        />
      ) : (
        // 📱 MODO MOBILE (vista previa de celular)
        <div className="w-[390px] h-[844px] bg-black rounded-[40px] p-3 shadow-xl border-4 border-black overflow-hidden">
          <iframe
            src={store.customUrl}
            className="w-full h-full rounded-[30px] bg-white"
          />
        </div>
      )}
    </div>
  );
}
