"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Trash2 } from "lucide-react";
import { ColorAttributeManager } from "./ColorAttributeManager";

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
  const [newAttributeName, setNewAttributeName] = useState("");
  const [newAttributeValue, setNewAttributeValue] = useState("");

  // Convertir colores de string[] a ColorInfo[] para el ColorAttributeManager
  const getColorsFromAttributes = (): ColorInfo[] => {
    const colorStrings = attributes["color"] || [];
    return colorStrings.map((colorStr) => {
      try {
        // Intentar parsear como JSON si contiene hex y name
        const parsed = JSON.parse(colorStr);
        return { hex: parsed.hex, name: parsed.name };
      } catch {
        // Si no es JSON, asumir que es solo el nombre
        return { hex: "#6B7280", name: colorStr };
      }
    });
  };

  // Convertir ColorInfo[] de vuelta a string[] para guardar
  const saveColorsToAttributes = (colors: ColorInfo[]) => {
    const colorStrings = colors.map((color) => JSON.stringify(color));
    onAttributesChange({
      ...attributes,
      color: colorStrings,
    });
  };

  const addAttribute = () => {
    if (newAttributeName.trim() && !attributes[newAttributeName.trim()]) {
      onAttributesChange({
        ...attributes,
        [newAttributeName.trim()]: [],
      });
      setNewAttributeName("");
    }
  };

  const removeAttribute = (attributeName: string) => {
    const newAttributes = { ...attributes };
    delete newAttributes[attributeName];
    onAttributesChange(newAttributes);
  };

  const addValueToAttribute = (attributeName: string) => {
    if (newAttributeValue.trim()) {
      const currentValues = attributes[attributeName] || [];
      if (!currentValues.includes(newAttributeValue.trim())) {
        onAttributesChange({
          ...attributes,
          [attributeName]: [...currentValues, newAttributeValue.trim()],
        });
        setNewAttributeValue("");
      }
    }
  };

  const removeValueFromAttribute = (
    attributeName: string,
    valueIndex: number
  ) => {
    const currentValues = attributes[attributeName] || [];
    const newValues = currentValues.filter((_, index) => index !== valueIndex);

    if (newValues.length === 0) {
      // Si no quedan valores, eliminar el atributo completo
      removeAttribute(attributeName);
    } else {
      onAttributesChange({
        ...attributes,
        [attributeName]: newValues,
      });
    }
  };

  const getAttributeColor = (index: number) => {
    const colors = [
      "bg-gray-100 text-gray-700",
      "bg-blue-100 text-blue-700",
      "bg-green-100 text-green-700",
      "bg-yellow-100 text-yellow-700",
      "bg-purple-100 text-purple-700",
      "bg-pink-100 text-pink-700",
      "bg-indigo-100 text-indigo-700",
      "bg-red-100 text-red-700",
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Sección de colores - siempre visible */}
      <div className="space-y-4">
        <Label>Colores</Label>
        <ColorAttributeManager
          colors={getColorsFromAttributes()}
          onColorsChange={saveColorsToAttributes}
        />
      </div>
    </div>
  );
};
