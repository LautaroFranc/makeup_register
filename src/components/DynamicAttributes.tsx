"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { ColorAttributeManager } from "./ColorAttributeManager";
import { ScentAttributeManager } from "./ScentAttributeManager";

interface DynamicAttributesProps {
  attributes: { [key: string]: string[] };
  onAttributesChange: (attributes: { [key: string]: string[] }) => void;
}

interface ColorInfo {
  hex: string;
  name: string;
}

export const DynamicAttributes: React.FC<DynamicAttributesProps> = ({
  attributes,
  onAttributesChange,
}) => {
  // ── Colores ──────────────────────────────────────────────────────────────
  const getColorsFromAttributes = (): ColorInfo[] => {
    const colorStrings = attributes["color"] || [];
    return colorStrings.map((colorStr) => {
      try {
        const parsed = JSON.parse(colorStr);
        return { hex: parsed.hex, name: parsed.name };
      } catch {
        return { hex: "#6B7280", name: colorStr };
      }
    });
  };

  const saveColorsToAttributes = (colors: ColorInfo[]) => {
    const colorStrings = colors.map((color) => JSON.stringify(color));
    onAttributesChange({ ...attributes, color: colorStrings });
  };

  // ── Aromas ───────────────────────────────────────────────────────────────
  const getScentsFromAttributes = (): string[] => {
    return attributes["aroma"] || [];
  };

  const saveScentsToAttributes = (scents: string[]) => {
    onAttributesChange({ ...attributes, aroma: scents });
  };

  return (
    <div className="space-y-8">
      {/* Colores */}
      <div className="space-y-2">
        <ColorAttributeManager
          colors={getColorsFromAttributes()}
          onColorsChange={saveColorsToAttributes}
        />
      </div>

      {/* Divisor */}
      <hr className="border-gray-200" />

      {/* Aromas / Perfumes */}
      <div className="space-y-2">
        <ScentAttributeManager
          scents={getScentsFromAttributes()}
          onScentsChange={saveScentsToAttributes}
        />
      </div>
    </div>
  );
};
