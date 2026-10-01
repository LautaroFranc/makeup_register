"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

interface StoreConfig {
  customUrl?: string;
}

export default function PublicStorePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const [store, setStore] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  // UTM de la URL del preview, para reenviarlos al iframe de la tienda real.
  const utmParams = new URLSearchParams();
  ["utm_source", "utm_medium", "utm_campaign"].forEach((key) => {
    const value = searchParams.get(key);
    if (value) utmParams.set(key, value);
  });
  const utmQuery = utmParams.toString();

  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        const configResponse = await fetch(`/api/stores/public/config/${slug}`);
        if (!configResponse.ok) throw new Error("Tienda no encontrada");

        const storeData = await configResponse.json();
        setStore(storeData);

        // Registra/recupera la campaña y la deja en cookie. El id devuelto
        // se reinyecta en el iframe para que el formulario de la tienda
        // (otro dominio) pueda mandarlo explícitamente.
        const trackResponse = await fetch("/api/track/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            utmSource: searchParams.get("utm_source"),
            utmMedium: searchParams.get("utm_medium"),
            utmCampaign: searchParams.get("utm_campaign"),
          }),
        });

        if (trackResponse.ok) {
          const trackData = await trackResponse.json();
          if (trackData.campaign?.id) setCampaignId(trackData.campaign.id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [slug, searchParams]);

  const iframeSrc = useMemo(() => {
    if (!store?.customUrl) return "";
    const params = new URLSearchParams(utmQuery);
    if (campaignId) params.set("campaign", campaignId);
    const query = params.toString();
    return query ? `${store.customUrl}${store.customUrl.includes("?") ? "&" : "?"}${query}` : store.customUrl;
  }, [store, utmQuery, campaignId]);

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
          src={iframeSrc}
          className="w-full h-[90vh] border rounded-lg shadow-lg"
        />
      ) : (
        // 📱 MODO MOBILE (vista previa de celular)
        <div className="w-[390px] h-[844px] bg-black rounded-[40px] p-3 shadow-xl border-4 border-black overflow-hidden">
          <iframe
            src={iframeSrc}
            className="w-full h-full rounded-[30px] bg-white"
          />
        </div>
      )}
    </div>
  );
}
