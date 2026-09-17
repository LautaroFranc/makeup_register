"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Send,
  ArrowLeft,
  Mail,
  Sparkles,
  Upload,
  Code,
  Eye,
  FileCode,
  Image as ImageIcon,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { buildEmailTemplate } from "@/lib/emailTemplate";

function NovedadesFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetParam = searchParams.get("target") || "all";
  const idsParam = searchParams.get("ids") || "";

  const [targetType, setTargetType] = useState<"all" | "selected">(
    targetParam === "selected" ? "selected" : "all"
  );
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>(
    idsParam ? idsParam.split(",") : []
  );

  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sending, setSending] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (targetParam === "selected" && idsParam) {
      setTargetType("selected");
      setSelectedLeadIds(idsParam.split(","));
    }
  }, [targetParam, idsParam]);

  // Subir imagen a Cloudinary mediante /api/upload-image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success && data.url) {
        const imageUrl = data.url;
        // Insertar imagen en el texto/HTML
        const imgTag = isHtmlMode
          ? `<img src="${imageUrl}" alt="Imagen Promocional" style="max-width: 100%; border-radius: 8px; margin: 12px 0;" />`
          : `\n![Imagen](${imageUrl})\n`;

        setContent((prev) => prev + "\n" + imgTag);

        toast({
          title: "¡Imagen subida a Cloudinary!",
          description: "La imagen se ha insertado automáticamente en el contenido.",
        });
      } else {
        toast({
          title: "Error al subir imagen",
          description: data.error || "No se pudo subir la imagen",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error de conexión",
        description: "No se pudo subir la imagen a Cloudinary",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      toast({
        title: "Asunto requerido",
        description: "Por favor ingresa el asunto de la novedad.",
        variant: "destructive",
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "Mensaje requerido",
        description: "Por favor escribe el mensaje o novedad a enviar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSending(true);
      const token = localStorage.getItem("token");

      const res = await fetch("/api/leads/send-newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject,
          content,
          isHtml: isHtmlMode,
          targetType,
          selectedLeadIds: targetType === "selected" ? selectedLeadIds : [],
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: "¡Novedad enviada!",
          description: data.message || "Correos enviados exitosamente.",
        });
        router.push("/leads");
      } else {
        toast({
          title: "Error al enviar",
          description: data.error || "Ocurrió un error al procesar el envío.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error inesperado",
        description: "Error de red al intentar enviar las novedades.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  // HTML generado para el Iframe de Vista Previa
  const previewHtml = buildEmailTemplate({
    storeName: "Nombre de tu Tienda",
    content: content || "<p style='color:#9ca3af; text-align:center;'>Empieza a escribir tu mensaje para ver la previsualización del correo en tiempo real...</p>",
    isHtml: isHtmlMode,
  });

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/leads")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Redactar Novedad & Promoción
          </h1>
          <p className="text-muted-foreground text-sm">
            Crea anuncios personalizados con HTML, subida de imágenes a Cloudinary y vista previa en vivo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Izquierda: Formulario y Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Contenido del Email
            </CardTitle>
            <CardDescription>
              Configura los destinatarios, imágenes y formato de tu correo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSend} className="space-y-5">
              {/* Destinatarios */}
              <div className="space-y-3 border p-4 rounded-lg bg-muted/20">
                <Label className="font-semibold text-sm">Destinatarios</Label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      value="all"
                      checked={targetType === "all"}
                      onChange={() => setTargetType("all")}
                      className="h-4 w-4 text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-normal">
                      Enviar a <strong>TODOS</strong> los clientes con email
                    </span>
                  </label>

                  <label
                    className={`flex items-center space-x-3 cursor-pointer ${
                      selectedLeadIds.length === 0 ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetType"
                      value="selected"
                      disabled={selectedLeadIds.length === 0}
                      checked={targetType === "selected"}
                      onChange={() => setTargetType("selected")}
                      className="h-4 w-4 text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-normal">
                      Enviar a <strong>clientes seleccionados</strong> ({selectedLeadIds.length})
                    </span>
                  </label>
                </div>
              </div>

              {/* Asunto */}
              <div className="space-y-2">
                <Label htmlFor="subject">Asunto del Correo *</Label>
                <Input
                  id="subject"
                  placeholder="Ej: ¡Nuevos ingresos de temporada y 20% OFF! 🎉"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              {/* Barra de herramientas: Modo HTML & Subir Imagen a Cloudinary */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 p-2.5 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={isHtmlMode ? "default" : "outline"}
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => setIsHtmlMode(!isHtmlMode)}
                  >
                    <Code className="h-3.5 w-3.5" />
                    {isHtmlMode ? "Modo HTML Activo" : "Modo Texto Plano"}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 gap-1.5 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingImage ? "Subiendo a Cloudinary..." : "Subir Imagen (Cloudinary)"}
                  </Button>
                </div>
              </div>

              {/* Mensaje */}
              <div className="space-y-2">
                <Label htmlFor="content">
                  {isHtmlMode ? "Código HTML del Correo *" : "Contenido / Mensaje *"}
                </Label>
                <Textarea
                  id="content"
                  placeholder={
                    isHtmlMode
                      ? "<h2>¡Gran Oferta!</h2>\n<p>Escribe tu código HTML aquí...</p>"
                      : "Escribe aquí el contenido de tu mensaje o promoción..."
                  }
                  rows={9}
                  className="font-mono text-sm"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              </div>

              {/* Botones de Acción */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/leads")}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={sending} className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  {sending ? "Enviando correos..." : "Enviar Novedad"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Columna Derecha: Vista Previa del Email en Tiempo Real */}
        <Card className="flex flex-col h-full">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" /> Vista Previa en Vivo
              </span>
              <span className="text-xs font-normal text-muted-foreground border px-2 py-0.5 rounded bg-muted">
                Previsualización en tiempo real
              </span>
            </CardTitle>
            <CardDescription className="truncate">
              <strong>Asunto:</strong> {subject || "(Sin asunto)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-3 bg-muted/20 min-h-[450px]">
            <div className="w-full h-full min-h-[420px] rounded-lg border bg-white overflow-hidden shadow-xs">
              <iframe
                title="Vista Previa de Email"
                srcDoc={previewHtml}
                className="w-full h-full min-h-[420px] border-0"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function NovedadesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Cargando editor de novedades...</div>}>
      <NovedadesFormContent />
    </Suspense>
  );
}
