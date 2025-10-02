import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeDisplayProps {
  value: string;
  format?: "CODE128" | "EAN13" | "EAN8" | "UPC" | "CODE39";
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
  className?: string;
}

export const BarcodeDisplay: React.FC<BarcodeDisplayProps> = ({
  value,
  format = "CODE128",
  width = 2,
  height = 100,
  displayValue = true,
  fontSize = 20,
  margin = 10,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        JsBarcode(canvasRef.current, value, {
          format: format,
          width: width,
          height: height,
          displayValue: displayValue,
          fontSize: fontSize,
          margin: margin,
          textAlign: "center",
          textPosition: "bottom",
          textMargin: 2,
          font: "monospace",
        });
      } catch (error) {
        console.error("Error generating barcode:", error);
      }
    }
  }, [value, format, width, height, displayValue, fontSize, margin]);

  if (!value) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded p-4 ${className}`}
      >
        <span className="text-gray-500 text-sm">Sin código de barras</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default BarcodeDisplay;
