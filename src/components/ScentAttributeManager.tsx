"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";

interface ScentAttributeManagerProps {
  scents: string[];
  onScentsChange: (scents: string[]) => void;
}

export const ScentAttributeManager: React.FC<ScentAttributeManagerProps> = ({
  scents,
  onScentsChange,
}) => {
  const [inputValue, setInputValue] = useState("");

  const addScent = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (!scents.includes(trimmed)) {
      onScentsChange([...scents, trimmed]);
    }
    setInputValue("");
  };

  const removeScent = (index: number) => {
    onScentsChange(scents.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      addScent();
    }
  };

  return (
    <div className="space-y-4">
      <Label className="text-lg font-semibold">Aromas / Perfumes</Label>

      {/* Input para agregar */}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ej: Vainilla, Rosa, Lavanda..."
        />
        <Button
          type="button"
          variant="outline"
          onClick={addScent}
          disabled={!inputValue.trim() || scents.includes(inputValue.trim())}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Aromas agregados */}
      {scents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {scents.map((scent, index) => (
            <span
              key={index}
              className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-800 text-sm px-3 py-1.5 rounded-full"
            >
              🌸 {scent}
              <button
                type="button"
                onClick={() => removeScent(index)}
                className="text-purple-400 hover:text-red-500 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {scents.length === 0 && (
        <p className="text-xs text-gray-400">
          Presioná Enter o el botón + para agregar un aroma.
        </p>
      )}
    </div>
  );
};
