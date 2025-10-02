"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Check, Palette, X } from "lucide-react";

interface ColorPickerProps {
  onColorSelect: (colors: { hex: string; name: string }[]) => void;
  trigger?: React.ReactNode;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  onColorSelect,
  trigger,
}) => {
  const [selectedColors, setSelectedColors] = useState<
    { hex: string; name: string }[]
  >([]);
  const [customColor, setCustomColor] = useState("#3B82F6");
  const [customName, setCustomName] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Paleta de colores predefinidos (sin duplicados)
  const colorPalette = [
    { hex: "#EF4444", name: "Rojo" },
    { hex: "#F97316", name: "Naranja" },
    { hex: "#EAB308", name: "Amarillo" },
    { hex: "#22C55E", name: "Verde" },
    { hex: "#06B6D4", name: "Cian" },
    { hex: "#3B82F6", name: "Azul" },
    { hex: "#8B5CF6", name: "Púrpura" },
    { hex: "#EC4899", name: "Rosa" },
    { hex: "#6B7280", name: "Gris" },
    { hex: "#000000", name: "Negro" },
    { hex: "#FFFFFF", name: "Blanco" },
    { hex: "#F59E0B", name: "Ámbar" },
    { hex: "#10B981", name: "Esmeralda" },
    { hex: "#6366F1", name: "Índigo" },
    { hex: "#F43F5E", name: "Rose" },
    { hex: "#84CC16", name: "Lima" },
    { hex: "#DC2626", name: "Rojo Oscuro" },
    { hex: "#EA580C", name: "Naranja Oscuro" },
    { hex: "#CA8A04", name: "Amarillo Oscuro" },
    { hex: "#16A34A", name: "Verde Oscuro" },
    { hex: "#0891B2", name: "Azul Oscuro" },
    { hex: "#7C3AED", name: "Violeta Oscuro" },
    { hex: "#DB2777", name: "Rosa Oscuro" },
    { hex: "#4B5563", name: "Gris Oscuro" },
    { hex: "#374151", name: "Gris Muy Oscuro" },
  ];

  const toggleColorSelection = (color: { hex: string; name: string }) => {
    setSelectedColors((prev) => {
      const isSelected = prev.some((c) => c.hex === color.hex);
      if (isSelected) {
        return prev.filter((c) => c.hex !== color.hex);
      } else {
        return [...prev, color];
      }
    });
  };

  const handleCustomColorChange = (hex: string) => {
    setCustomColor(hex);
  };

  const handleConfirm = () => {
    onColorSelect(selectedColors);
    setSelectedColors([]);
    setIsOpen(false);
  };

  const handleCustomColorSubmit = () => {
    if (customName.trim()) {
      const customColorObj = { hex: customColor, name: customName.trim() };
      setSelectedColors((prev) => [...prev, customColorObj]);
      setCustomName("");
    }
  };

  const removeSelectedColor = (colorToRemove: {
    hex: string;
    name: string;
  }) => {
    setSelectedColors((prev) =>
      prev.filter((c) => c.hex !== colorToRemove.hex)
    );
  };

  const defaultTrigger = (
    <Button type="button" variant="outline" size="sm">
      <Palette className="h-4 w-4 mr-2" />
      Seleccionar Colores
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Seleccionar Colores ({selectedColors.length} seleccionados)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Colores seleccionados */}
          {selectedColors.length > 0 && (
            <div className="space-y-3">
              <Label>Colores Seleccionados</Label>
              <div className="flex flex-wrap gap-2">
                {selectedColors.map((color) => (
                  <div
                    key={color.hex}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg"
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-sm font-medium">{color.name}</span>
                    <button
                      type="button"
                      onClick={() => removeSelectedColor(color)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paleta de colores */}
          <div className="space-y-3">
            <Label>Paleta de Colores</Label>
            <div className="grid grid-cols-6 gap-2">
              {colorPalette.map((color) => {
                const isSelected = selectedColors.some(
                  (c) => c.hex === color.hex
                );
                return (
                  <button
                    key={color.hex}
                    type="button"
                    className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-105 ${
                      isSelected
                        ? "border-gray-800 ring-2 ring-gray-300"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                    style={{ backgroundColor: color.hex }}
                    onClick={() => toggleColorSelection(color)}
                    title={color.name}
                  >
                    {isSelected && (
                      <div className="flex items-center justify-center w-full h-full">
                        <Check className="h-4 w-4 text-white drop-shadow-lg" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selector de color personalizado */}
          <div className="space-y-3">
            <Label>Agregar Color Personalizado</Label>
            <div className="flex gap-3">
              <Input
                type="color"
                value={customColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                className="w-16 h-10 p-1 border rounded cursor-pointer"
              />
              <Input
                type="text"
                placeholder="Código hexadecimal"
                value={customColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nombre del color"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleCustomColorSubmit}
                disabled={!customName.trim()}
                size="sm"
              >
                Agregar
              </Button>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedColors([]);
                setIsOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={selectedColors.length === 0}
            >
              <Check className="h-4 w-4 mr-2" />
              Confirmar ({selectedColors.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
