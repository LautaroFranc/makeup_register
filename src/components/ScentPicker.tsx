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
import { Check, Sparkles, X } from "lucide-react";

interface ScentPickerProps {
  onScentSelect: (scents: string[]) => void;
  trigger?: React.ReactNode;
}

// Emojis asociados a cada categoría de aroma para hacerlo visual
const SCENT_CATEGORIES = [
  {
    label: "Florales",
    scents: ["Rosa", "Jazmín", "Lavanda", "Azahar", "Violeta", "Magnolia", "Gardenia"],
  },
  {
    label: "Frutales",
    scents: ["Vainilla", "Fresa", "Durazno", "Mango", "Coco", "Limón", "Cereza"],
  },
  {
    label: "Frescos",
    scents: ["Menta", "Eucalipto", "Marino", "Bergamota", "Pepino", "Té Verde"],
  },
  {
    label: "Orientales / Cálidos",
    scents: ["Ámbar", "Sándalo", "Musgo", "Almizcle", "Patchouli", "Canela", "Vainilla Negra"],
  },
  {
    label: "Sin aroma",
    scents: ["Sin perfume", "Neutro", "Hipoalergénico"],
  },
];

export const ScentPicker: React.FC<ScentPickerProps> = ({
  onScentSelect,
  trigger,
}) => {
  const [selectedScents, setSelectedScents] = useState<string[]>([]);
  const [customScent, setCustomScent] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const toggleScent = (scent: string) => {
    setSelectedScents((prev) =>
      prev.includes(scent) ? prev.filter((s) => s !== scent) : [...prev, scent]
    );
  };

  const handleCustomScentAdd = () => {
    const trimmed = customScent.trim();
    if (trimmed && !selectedScents.includes(trimmed)) {
      setSelectedScents((prev) => [...prev, trimmed]);
      setCustomScent("");
    }
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCustomScentAdd();
    }
  };

  const removeSelected = (scent: string) => {
    setSelectedScents((prev) => prev.filter((s) => s !== scent));
  };

  const handleConfirm = () => {
    onScentSelect(selectedScents);
    setSelectedScents([]);
    setIsOpen(false);
  };

  const defaultTrigger = (
    <Button type="button" variant="outline" size="sm">
      <Sparkles className="h-4 w-4 mr-2" />
      Seleccionar Aromas
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Seleccionar Aromas ({selectedScents.length} seleccionados)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Aromas seleccionados */}
          {selectedScents.length > 0 && (
            <div className="space-y-2">
              <Label>Seleccionados</Label>
              <div className="flex flex-wrap gap-2">
                {selectedScents.map((scent) => (
                  <div
                    key={scent}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                  >
                    {scent}
                    <button
                      type="button"
                      onClick={() => removeSelected(scent)}
                      className="text-purple-500 hover:text-purple-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categorías de aromas */}
          {SCENT_CATEGORIES.map((category) => (
            <div key={category.label} className="space-y-2">
              <Label className="text-xs text-gray-500 uppercase tracking-wide">
                {category.label}
              </Label>
              <div className="flex flex-wrap gap-2">
                {category.scents.map((scent) => {
                  const isSelected = selectedScents.includes(scent);
                  return (
                    <button
                      key={scent}
                      type="button"
                      onClick={() => toggleScent(scent)}
                      className={`px-3 py-1.5 text-sm border rounded-full transition-all ${
                        isSelected
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:bg-purple-50"
                      }`}
                    >
                      {isSelected && <Check className="inline h-3 w-3 mr-1" />}
                      {scent}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Aroma personalizado */}
          <div className="space-y-2 pt-2 border-t">
            <Label>Aroma personalizado</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ej: Oud, Neroli, Pachulí..."
                value={customScent}
                onChange={(e) => setCustomScent(e.target.value)}
                onKeyDown={handleCustomKeyDown}
                className="flex-1"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleCustomScentAdd}
                disabled={!customScent.trim()}
              >
                Agregar
              </Button>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedScents([]);
                setIsOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={selectedScents.length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              Confirmar ({selectedScents.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
