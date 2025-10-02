"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";
import { ColorPicker } from "./ColorPicker";
import { useToast } from "@/hooks/use-toast";

interface ColorAttributeManagerProps {
  colors: Array<{ hex: string; name: string }>;
  onColorsChange: (colors: Array<{ hex: string; name: string }>) => void;
}

export const ColorAttributeManager: React.FC<ColorAttributeManagerProps> = ({
  colors,
  onColorsChange,
}) => {
  const { toast } = useToast();
  const addColors = (newColors: Array<{ hex: string; name: string }>) => {
    const validColors: Array<{ hex: string; name: string }> = [];
    const duplicateColors: string[] = [];

    newColors.forEach((newColor) => {
      // Verificar si el color ya existe (por hex o por nombre)
      const colorExists = colors.some(
        (color) =>
          color.hex.toLowerCase() === newColor.hex.toLowerCase() ||
          color.name.toLowerCase() === newColor.name.toLowerCase()
      );

      if (!colorExists) {
        validColors.push(newColor);
      } else {
        duplicateColors.push(newColor.name);
      }
    });

    if (validColors.length > 0) {
      onColorsChange([...colors, ...validColors]);
      toast({
        description: `${validColors.length} color(es) agregado(s) exitosamente`,
        variant: "default",
      });
    }

    if (duplicateColors.length > 0) {
      toast({
        description: `Los siguientes colores ya existen: ${duplicateColors.join(
          ", "
        )}`,
        variant: "destructive",
      });
    }
  };

  const removeColor = (index: number) => {
    onColorsChange(colors.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-lg font-semibold">Colores del Producto</Label>
        <ColorPicker onColorSelect={addColors} />
      </div>

      {/* Lista de colores seleccionados */}
      {colors.length > 0 && (
        <div className="space-y-3">
          <Label>Colores Seleccionados</Label>
          <div className="flex flex-wrap gap-3">
            {colors.map((color, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-white border rounded-lg p-3 shadow-sm"
              >
                {/* Círculo de color */}
                <div
                  className="w-8 h-8 rounded-full border-2 border-gray-300 shadow-sm"
                  style={{ backgroundColor: color.hex }}
                />

                {/* Información del color */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{color.name}</p>
                  <p className="text-xs text-gray-500">{color.hex}</p>
                </div>

                {/* Botón de eliminar */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeColor(index)}
                  className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay colores */}
      {colors.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Plus className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-sm">No hay colores seleccionados</p>
          <p className="text-xs text-gray-400 mt-1">
            Haz clic en "Seleccionar Color" para agregar colores
          </p>
        </div>
      )}
    </div>
  );
};
