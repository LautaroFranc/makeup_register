"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, Palette } from "lucide-react";

interface AttributesModalProps {
  attributes: { [key: string]: string[] };
  isOpen: boolean;
  onClose: () => void;
  productName: string;
}

export const AttributesModal: React.FC<AttributesModalProps> = ({
  attributes,
  isOpen,
  onClose,
  productName,
}) => {
  if (!attributes || Object.keys(attributes).length === 0) {
    return null;
  }

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Atributos de {productName}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {Object.entries(attributes).map(
            ([attributeName, values], attributeIndex) => (
              <div key={attributeName} className="space-y-3">
                <div className="flex items-center gap-2">
                  {attributeName === "color" && (
                    <Palette className="h-5 w-5 text-gray-600" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-800 capitalize">
                    {attributeName}
                  </h3>
                  <span className="text-sm text-gray-500">
                    ({values.length}{" "}
                    {values.length === 1 ? "opción" : "opciones"})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {values.map((value, valueIndex) => {
                    // Manejo especial para colores
                    if (attributeName === "color") {
                      try {
                        // Intentar parsear como JSON si contiene hex y name
                        const colorInfo = JSON.parse(value);
                        return (
                          <div
                            key={valueIndex}
                            className="flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div
                              className="w-8 h-8 rounded-full border-2 border-gray-300 shadow-sm"
                              style={{ backgroundColor: colorInfo.hex }}
                            />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {colorInfo.name}
                              </p>
                              <p className="text-sm text-gray-500 font-mono">
                                {colorInfo.hex}
                              </p>
                            </div>
                          </div>
                        );
                      } catch {
                        // Si no es JSON, mostrar como texto normal
                        return (
                          <div
                            key={valueIndex}
                            className={`p-3 rounded-lg ${getAttributeColor(
                              valueIndex
                            )}`}
                          >
                            <p className="font-medium">{value}</p>
                          </div>
                        );
                      }
                    }

                    // Manejo normal para otros atributos
                    return (
                      <div
                        key={valueIndex}
                        className={`p-3 rounded-lg ${getAttributeColor(
                          valueIndex
                        )}`}
                      >
                        <p className="font-medium">{value}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
