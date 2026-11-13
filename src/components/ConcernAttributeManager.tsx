"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Sparkles } from "lucide-react";

interface ConcernAttributeManagerProps {
  concerns: string[];
  onConcernsChange: (concerns: string[]) => void;
}

const COMMON_CONCERNS = [
  "Cabello dañado",
  "Cabello seco y opaco",
  "Cabello con frizz",
  "Cabello rizado",
  "Cabello teñido",
  "Cabello fino y quebradizo",
  "Cabello graso",
  "Cabello con canas",
  "Kits en movimiento",
];

export const ConcernAttributeManager: React.FC<ConcernAttributeManagerProps> = ({
  concerns,
  onConcernsChange,
}) => {
  const [inputValue, setInputValue] = useState("");

  const toggleConcern = (concern: string) => {
    const trimmed = concern.trim();
    if (!trimmed) return;
    if (concerns.includes(trimmed)) {
      onConcernsChange(concerns.filter((c) => c !== trimmed));
    } else {
      onConcernsChange([...concerns, trimmed]);
    }
  };

  const addCustomConcern = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (!concerns.includes(trimmed)) {
      onConcernsChange([...concerns, trimmed]);
    }
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      addCustomConcern();
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <Label className="text-base font-semibold">
            Preocupación / Tipo de cabello
          </Label>
          <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
            Filtro para tienda pública
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Seleccioná una o varias necesidades para que el producto aparezca en el menú de navegación dinámico.
        </p>
      </div>

      {/* Sugerencias rápidas (chips toggle) */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {COMMON_CONCERNS.map((item) => {
          const isSelected = concerns.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => toggleConcern(item)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                isSelected
                  ? "bg-amber-100 border-amber-300 text-amber-900 font-medium shadow-sm"
                  : "bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {isSelected ? "✓ " : "+ "}
              {item}
            </button>
          );
        })}
      </div>

      {/* Input para agregar una personalizada */}
      <div className="flex gap-2 pt-1">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="O escribí otra preocupación personalizada..."
          className="text-sm"
        />
        <Button
          type="button"
          variant="outline"
          onClick={addCustomConcern}
          disabled={!inputValue.trim() || concerns.includes(inputValue.trim())}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Preocupaciones seleccionadas */}
      {concerns.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {concerns.map((concern, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-1 rounded-full"
            >
              <Sparkles className="h-3 w-3 text-amber-600" />
              {concern}
              <button
                type="button"
                onClick={() => toggleConcern(concern)}
                className="text-amber-500 hover:text-red-500 transition-colors ml-0.5"
                title="Quitar"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

