"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ArrowUp, ArrowDown, Sparkles } from "lucide-react";

export interface ProductSection {
  title: string;
  content: string;
}

interface SectionsManagerProps {
  sections: ProductSection[];
  onChange: (sections: ProductSection[]) => void;
}

const PRESET_TEMPLATES = [
  {
    title: "Resultados y Beneficios",
    placeholder:
      "• Acabado profesional de larga durabilidad.\n• Fórmula testeada para máxima eficacia.\n• Aporta brillo y nutrición desde la primera aplicación.",
  },
  {
    title: "Modo de uso",
    placeholder:
      "1. Limpiar y preparar la zona antes de comenzar.\n2. Aplicar la cantidad requerida de manera homogénea.\n3. Dejar actuar o secar según la técnica específica.",
  },
  {
    title: "Ingredientes y Especificaciones",
    placeholder:
      "• Contenido neto / Formato: Profesional.\n• Componentes principales seleccionados para salón.\n• Precauciones: Mantener en lugar fresco.",
  },
];

export const SectionsManager: React.FC<SectionsManagerProps> = ({
  sections = [],
  onChange,
}) => {
  const handleAddPreset = (title: string, defaultPlaceholder: string) => {
    // Si ya existe una sección con el mismo título, no duplicarla o agregar con número
    const exists = sections.some(
      (s) => s.title.trim().toLowerCase() === title.trim().toLowerCase()
    );
    if (exists) {
      return;
    }
    onChange([...sections, { title, content: "" }]);
  };

  const handleAddCustom = () => {
    onChange([...sections, { title: "", content: "" }]);
  };

  const handleUpdate = (index: number, field: "title" | "content", value: string) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(sections.filter((_, i) => i !== index));
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
        <div>
          <Label className="text-base font-semibold text-gray-800">
            Características y Secciones del Producto (Acordeones)
          </Label>
          <p className="text-xs text-gray-500">
            Pestañas colapsables que se verán en la tienda pública (ej: Beneficios, Modo de uso, Ingredientes).
          </p>
        </div>
      </div>

      {/* Botones de sugerencias rápidas */}
      <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-stone-50 border border-stone-200 rounded-lg">
        <span className="text-xs font-medium text-stone-600 flex items-center gap-1 mr-1">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Plantillas rápidas:
        </span>
        {PRESET_TEMPLATES.map((preset) => {
          const isAdded = sections.some(
            (s) => s.title.trim().toLowerCase() === preset.title.trim().toLowerCase()
          );
          return (
            <Button
              key={preset.title}
              type="button"
              variant={isAdded ? "secondary" : "outline"}
              size="sm"
              disabled={isAdded}
              onClick={() => handleAddPreset(preset.title, preset.placeholder)}
              className="text-xs h-7 px-2.5"
            >
              {isAdded ? "✓ " : "+ "}
              {preset.title}
            </Button>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddCustom}
          className="text-xs h-7 px-2.5 ml-auto border-dashed border-stone-300"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Nueva sección
        </Button>
      </div>

      {/* Lista de secciones actuales */}
      {sections.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
          <p className="text-sm text-gray-500">
            No has agregado secciones adicionales aún.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Haz clic en una de las plantillas rápidas de arriba para agregar Resultados, Modo de uso o Ingredientes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => (
            <div
              key={index}
              className="border border-stone-200 rounded-lg p-3 bg-white shadow-sm space-y-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-400 w-5">
                  #{index + 1}
                </span>
                <Input
                  value={section.title}
                  onChange={(e) => handleUpdate(index, "title", e.target.value)}
                  placeholder="Título de la sección (ej. Modo de uso)"
                  className="h-8 text-sm font-medium flex-1"
                />
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === 0}
                    onClick={() => handleMove(index, "up")}
                    className="h-7 w-7 text-gray-500"
                    title="Subir"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === sections.length - 1}
                    onClick={() => handleMove(index, "down")}
                    className="h-7 w-7 text-gray-500"
                    title="Bajar"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(index)}
                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div>
                <Textarea
                  value={section.content}
                  onChange={(e) => handleUpdate(index, "content", e.target.value)}
                  placeholder="Detalle o instrucciones de esta sección... Puedes usar saltos de línea y viñetas."
                  rows={3}
                  className="text-xs leading-relaxed"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
