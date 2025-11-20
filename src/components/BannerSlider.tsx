"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BannerSliderProps {
  bannerUrls: string[];
  storeName: string;
  autoPlayInterval?: number; // en milisegundos
  className?: string;
}

export const BannerSlider: React.FC<BannerSliderProps> = ({
  bannerUrls,
  storeName,
  autoPlayInterval = 5000,
  className = "",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Si no hay banners, no mostrar nada
  if (!bannerUrls || bannerUrls.length === 0) {
    return null;
  }

  // Auto-play
  useEffect(() => {
    if (!isAutoPlaying || bannerUrls.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bannerUrls.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isAutoPlaying, bannerUrls.length, autoPlayInterval]);

  const goToPrevious = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? bannerUrls.length - 1 : prev - 1
    );
    setIsAutoPlaying(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % bannerUrls.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  return (
    <div className={`relative w-full bg-gray-100 ${className}`}>
      {/* Banner principal */}
      <div className="relative w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden">
        <Image
          src={bannerUrls[currentIndex]}
          alt={`${storeName} - Banner ${currentIndex + 1}`}
          fill
          className="object-cover"
          priority={currentIndex === 0}
          sizes="100vw"
        />

        {/* Overlay gradient para mejor legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Controles de navegación - solo si hay más de 1 banner */}
      {bannerUrls.length > 1 && (
        <>
          {/* Botones prev/next */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full shadow-lg"
            onClick={goToPrevious}
            aria-label="Banner anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full shadow-lg"
            onClick={goToNext}
            aria-label="Siguiente banner"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>

          {/* Indicadores de posición (dots) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {bannerUrls.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? "bg-white w-8"
                    : "bg-white/50 hover:bg-white/75"
                }`}
                aria-label={`Ir al banner ${index + 1}`}
              />
            ))}
          </div>

          {/* Contador */}
          <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {bannerUrls.length}
          </div>
        </>
      )}
    </div>
  );
};
