"use client";
import * as XLSX from "xlsx";

import React, { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  SkipForward,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface ImportSummary {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

interface ImportResult {
  success: boolean;
  summary: ImportSummary;
  skipped: { row: number; name: string; reason: string }[];
  errors: { row: number; message: string }[];
  message: string;
}

interface ImportProductsModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ModalStep = "upload" | "loading" | "result";

export function ImportProductsModal({
  open,
  onClose,
  onSuccess,
}: ImportProductsModalProps) {
  const [step, setStep] = useState<ModalStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetModal = () => {
    setStep("upload");
    setFile(null);
    setResult(null);
    setIsDragging(false);
    setUpdateExisting(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      toast({
        description: "Solo se aceptan archivos Excel (.xlsx, .xls)",
        variant: "destructive",
      });
      return;
    }
    setFile(selectedFile);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleImport = async () => {
    if (!file) return;
    setStep("loading");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("updateExisting", String(updateExisting));
      const token = localStorage.getItem("token");

      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data: ImportResult = await res.json();
      setResult(data);
      setStep("result");

      if (data.success && (data.summary.created > 0 || data.summary.updated > 0)) {
        onSuccess?.();
      }
    } catch {
      toast({
        description: "Error de red al intentar importar. Intenta nuevamente.",
        variant: "destructive",
      });
      setStep("upload");
    }
  };

  // Descargar plantilla Excel (.xlsx) con formato
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // ── Hoja 1: Plantilla de productos ──────────────────────────────
    const headers = [
      "nombre",
      "descripcion",
      "categoria",
      "marca",
      "precio compra",
      "precio venta",
      "precio mayorista",
      "stock",
      "publicado",
    ];

    const exampleRows = [
      [
        "Base Líquida",
        "Base de maquillaje cobertura total",
        "Bases",
        "Maybelline",
        1500,
        2500,
        2000,
        10,
        "si",
      ],
      [
        "Labial Mate",
        "Labial de larga duración",
        "Labiales",
        "Rimmel",
        800,
        1400,
        1200,
        25,
        "si",
      ],
      [
        "Corrector HD",
        "",
        "Correctores",
        "",
        600,
        1100,
        0,
        5,
        "no",
      ],
    ];

    const wsData = [headers, ...exampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Anchos de columna
    ws["!cols"] = [
      { wch: 28 }, // nombre
      { wch: 38 }, // descripcion
      { wch: 20 }, // categoria
      { wch: 18 }, // marca
      { wch: 16 }, // precio compra
      { wch: 16 }, // precio venta
      { wch: 18 }, // precio mayorista
      { wch: 10 }, // stock
      { wch: 12 }, // publicado
    ];

    // Estilo encabezados (verde)
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "16A34A" } },
      alignment: { horizontal: "center" },
      border: {
        bottom: { style: "medium", color: { rgb: "FFFFFF" } },
      },
    };
    headers.forEach((_, colIdx) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIdx });
      if (ws[cellAddress]) {
        ws[cellAddress].s = headerStyle;
      }
    });

    // Estilo filas de ejemplo (fondo gris claro)
    const exampleStyle = {
      fill: { fgColor: { rgb: "F3F4F6" } },
      alignment: { horizontal: "left" },
    };
    exampleRows.forEach((_, rowIdx) => {
      headers.forEach((__, colIdx) => {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx });
        if (ws[cellAddress]) {
          ws[cellAddress].s = exampleStyle;
        }
      });
    });

    XLSX.utils.book_append_sheet(wb, ws, "Productos");

    // ── Hoja 2: Instrucciones ────────────────────────────────────────
    const instrData = [
      ["GUÍA DE IMPORTACIÓN DE PRODUCTOS"],
      [""],
      ["Columna", "¿Requerida?", "Descripción", "Valores válidos / Ejemplo"],
      ["nombre",          "✅ Sí",  "Nombre del producto",                    "Base Líquida"],
      ["descripcion",     "No",     "Descripción breve del producto",         "Cobertura total, tono medio"],
      ["categoria",       "✅ Sí",  "Categoría del producto",                 "Bases, Labiales, Correctores..."],
      ["marca",           "No",     "Marca del producto",                     "Maybelline, Rimmel, Karely"],
      ["precio compra",   "No",     "Precio de costo (número)",               "1500"],
      ["precio venta",    "No",     "Precio de venta al público (número)",    "2500"],
      ["precio mayorista","No",     "Precio para mayoristas (número)",        "2000  (0 si no aplica)"],
      ["stock",           "No",     "Cantidad en stock (entero)",             "10"],
      ["publicado",       "No",     "¿Visible en la tienda? (defecto: sí)",   "si / no / true / false / 1 / 0"],
      [""],
      ["NOTAS:"],
      ["• Los productos con el mismo nombre que ya existen serán omitidos (no se sobreescriben)."],
      ["• La primera fila del Excel debe contener los encabezados exactamente como se indica."],
      ["• Podés usar coma o punto como separador decimal en los precios."],
      ["• Las columnas pueden estar en cualquier orden."],
    ];

    const wsInstr = XLSX.utils.aoa_to_sheet(instrData);
    wsInstr["!cols"] = [
      { wch: 20 },
      { wch: 14 },
      { wch: 42 },
      { wch: 38 },
    ];

    // Estilo título
    if (wsInstr["A1"]) {
      wsInstr["A1"].s = {
        font: { bold: true, sz: 14, color: { rgb: "16A34A" } },
      };
    }
    // Estilo encabezados de tabla
    ["A3", "B3", "C3", "D3"].forEach((addr) => {
      if (wsInstr[addr]) {
        wsInstr[addr].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "374151" } },
        };
      }
    });

    XLSX.utils.book_append_sheet(wb, wsInstr, "Instrucciones");

    // Descargar
    XLSX.writeFile(wb, "plantilla_productos.xlsx");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Importar Productos desde Excel
          </DialogTitle>
          <DialogDescription>
            Subí un archivo Excel con tus productos y los agregaremos
            automáticamente.
          </DialogDescription>
        </DialogHeader>

        {/* ========== PASO: UPLOAD ========== */}
        {step === "upload" && (
          <div className="space-y-4">
            {/* Zona de drop */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                ${
                  isDragging
                    ? "border-blue-500 bg-blue-50 scale-[1.02]"
                    : file
                    ? "border-green-400 bg-green-50"
                    : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />

              {file ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="w-10 h-10 mx-auto text-green-500" />
                  <p className="font-semibold text-green-700">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-1"
                  >
                    <X className="w-3 h-3" /> Quitar archivo
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-10 h-10 mx-auto text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-700">
                      Arrastrá tu archivo acá o hacé clic para seleccionar
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Formatos aceptados: .xlsx, .xls
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Columnas esperadas */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 space-y-1">
              <p className="font-semibold">Columnas del Excel:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                <span>
                  • <strong>nombre</strong> *(requerido)
                </span>
                <span>
                  • <strong>categoria</strong> *(requerido)
                </span>
                <span>• precio compra</span>
                <span>• precio venta</span>
                <span>• precio mayorista</span>
                <span>• stock</span>
                <span>• descripcion</span>
                <span>• marca</span>
                <span>• publicado (si/no)</span>
              </div>
            </div>

            {/* Botón descargar plantilla */}
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-2 text-sm text-green-700 hover:text-green-900 font-medium underline underline-offset-2 mx-auto"
            >
              <Download className="w-4 h-4" /> Descargar plantilla Excel (.xlsx)
            </button>

            {/* Toggle actualizar existentes */}
            <div
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                updateExisting
                  ? "bg-purple-50 border-purple-300"
                  : "bg-gray-50 border-gray-200"
              }`}
              onClick={() => setUpdateExisting((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <RefreshCw
                  className={`w-4 h-4 ${
                    updateExisting ? "text-purple-600" : "text-gray-400"
                  }`}
                />
                <div>
                  <p className={`text-sm font-medium ${
                    updateExisting ? "text-purple-800" : "text-gray-700"
                  }`}>
                    Actualizar productos existentes
                  </p>
                  <p className="text-xs text-gray-500">
                    {updateExisting
                      ? "Los productos con el mismo nombre serán actualizados"
                      : "Los productos con el mismo nombre serán omitidos"}
                  </p>
                </div>
              </div>
              <div
                className={`w-10 h-5 rounded-full relative transition-colors ${
                  updateExisting ? "bg-purple-600" : "bg-gray-300"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    updateExisting ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={!file}
                className="bg-green-600 hover:bg-green-700"
              >
                <Upload className="w-4 h-4 mr-2" /> Importar
              </Button>
            </div>
          </div>
        )}

        {/* ========== PASO: LOADING ========== */}
        {step === "loading" && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin" />
            <p className="font-medium text-gray-700">Procesando archivo...</p>
            <p className="text-sm text-gray-500">
              Esto puede tardar unos segundos
            </p>
          </div>
        )}

        {/* ========== PASO: RESULT ========== */}
        {step === "result" && result && (
          <div className="space-y-4">
            {/* Banner principal */}
            <div
              className={`p-4 rounded-xl text-center ${
                result.summary.created > 0 || result.summary.updated > 0
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              {result.summary.created > 0 || result.summary.updated > 0 ? (
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500" />
              ) : (
                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-red-500" />
              )}
              <p className="font-semibold text-gray-800">{result.message}</p>
            </div>

            {/* Contadores */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">
                  {result.summary.total}
                </p>
                <p className="text-xs text-gray-600">Total</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">
                  {result.summary.created}
                </p>
                <p className="text-xs text-gray-600">Creados</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-700">
                  {result.summary.updated ?? 0}
                </p>
                <p className="text-xs text-gray-600">Actualizados</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-700">
                  {result.summary.skipped + result.summary.errors}
                </p>
                <p className="text-xs text-gray-600">Omit. / Error</p>
              </div>
            </div>

            {/* Omitidos (duplicados) */}
            {result.skipped.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-semibold flex items-center gap-1 text-orange-700">
                  <SkipForward className="w-4 h-4" /> Omitidos por duplicado (
                  {result.skipped.length})
                </p>
                <div className="max-h-28 overflow-y-auto text-xs text-gray-600 bg-orange-50 rounded-lg p-2 space-y-0.5">
                  {result.skipped.map((s, i) => (
                    <div key={i} className="flex items-start gap-1">
                      <span className="text-orange-400">•</span>
                      <span>
                        <strong>{s.name}</strong>: {s.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errores */}
            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-semibold flex items-center gap-1 text-red-700">
                  <AlertCircle className="w-4 h-4" /> Errores ({result.errors.length}
                  )
                </p>
                <div className="max-h-28 overflow-y-auto text-xs text-gray-600 bg-red-50 rounded-lg p-2 space-y-0.5">
                  {result.errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-1">
                      <span className="text-red-400">•</span>
                      <span>{e.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  resetModal();
                }}
              >
                Importar otro archivo
              </Button>
              <Button onClick={handleClose}>Cerrar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
