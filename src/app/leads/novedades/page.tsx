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
  Save,
  Bookmark,
  Trash2,
  Package,
  Store as StoreIcon,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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

  // Datos reales cargados para la vista previa
  const [realProducts, setRealProducts] = useState<any[]>([]);
  const [storeName, setStoreName] = useState("Nuestra Tienda");
  const [storeUrl, setStoreUrl] = useState("");

  // Plantillas guardadas por el usuario
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [templateSaveName, setTemplateSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  useEffect(() => {
    if (targetParam === "selected" && idsParam) {
      setTargetType("selected");
      setSelectedLeadIds(idsParam.split(","));
    }
  }, [targetParam, idsParam]);

  // Cargar productos y datos de tienda para la vista previa en tiempo real
  useEffect(() => {
    const fetchPreviewData = async () => {
      try {
        const token = localStorage.getItem("token");

        // 1. Cargar 4 productos más recientes
        const prodRes = await fetch("/api/products/private?limit=4", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const prodData = await prodRes.json();
        if (prodData.success) {
          setRealProducts(prodData.data || prodData.products || []);
        }

        // 2. Cargar tienda
        const storeRes = await fetch("/api/stores", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const storeData = await storeRes.json();
        if (storeData.success && storeData.stores?.length > 0) {
          const st = storeData.stores[0];
          setStoreName(st.name || "Nuestra Tienda");
          if (st.slug) {
            setStoreUrl(`${window.location.origin}/store/${st.slug}`);
          }
        }
      } catch (err) {
        console.error("Error al cargar datos de vista previa:", err);
      }
    };

    fetchPreviewData();

    // Cargar plantillas guardadas de localStorage
    try {
      const stored = localStorage.getItem("saved_novedades_templates");
      if (stored) {
        setSavedTemplates(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error al cargar plantillas guardadas:", e);
    }
  }, []);

  // Guardar plantilla actual
  const handleSaveTemplate = () => {
    if (!templateSaveName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Ingresa un nombre para identificar tu plantilla.",
        variant: "destructive",
      });
      return;
    }

    const newTmpl = {
      id: Date.now().toString(),
      name: templateSaveName.trim(),
      subject,
      content,
      isHtmlMode,
      createdAt: new Date().toISOString(),
    };

    const updated = [newTmpl, ...savedTemplates];
    setSavedTemplates(updated);
    localStorage.setItem("saved_novedades_templates", JSON.stringify(updated));
    setTemplateSaveName("");
    setShowSaveInput(false);

    toast({
      title: "¡Plantilla guardada!",
      description: `Se guardó "${newTmpl.name}" para reutilizar más adelante.`,
    });
  };

  // Cargar plantilla guardada
  const handleLoadSavedTemplate = (tmpl: any) => {
    setSubject(tmpl.subject || "");
    setContent(tmpl.content || "");
    if (tmpl.isHtmlMode !== undefined) setIsHtmlMode(tmpl.isHtmlMode);

    toast({
      title: "Plantilla cargada",
      description: `Se cargó "${tmpl.name}".`,
    });
  };

  // Eliminar plantilla guardada
  const handleDeleteSavedTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedTemplates.filter((t) => t.id !== id);
    setSavedTemplates(updated);
    localStorage.setItem("saved_novedades_templates", JSON.stringify(updated));

    toast({ title: "Plantilla eliminada" });
  };

  // Insertar etiqueta variable al hacer clic
  const insertTag = (tag: string) => {
    setContent((prev) => (prev ? `${prev}\n${tag}` : tag));
    setIsHtmlMode(true);
    toast({
      title: `Etiqueta ${tag} agregada`,
      description: "Se procesará automáticamente con los datos correspondientes.",
    });
  };

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
        const imgTag = isHtmlMode
          ? `<img src="${imageUrl}" alt="Imagen Promocional" style="max-width: 100%; border-radius: 8px; margin: 12px 0;" />`
          : `\n![Imagen](${imageUrl})\n`;

        setContent((prev) => prev + "\n" + imgTag);

        toast({
          title: "¡Imagen subida a Cloudinary!",
          description: "La imagen se ha insertado automáticamente.",
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
        description: "Por favor ingresa el asunto del correo.",
        variant: "destructive",
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "Mensaje requerido",
        description: "Por favor escribe el contenido de la novedad.",
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

  // Reemplazar etiquetas variables ({productos_recientes}, {catalogo}, {tienda}) en la vista previa
  const getProcessedContentForPreview = () => {
    if (!content.trim()) {
      return "<p style='color:#9ca3af; text-align:center;'>El contenido de tu correo se mostrará aquí...</p>";
    }

    let raw = content;

    // Reemplazar {productos_recientes} o {producto_reciente} con productos reales únicamente si la variable está presente en el texto
    if (raw.includes("{productos_recientes}") || raw.includes("{producto_reciente}")) {
      let cardsHtml = "";
      if (realProducts && realProducts.length > 0) {
        cardsHtml = realProducts
          .slice(0, 4)
          .map((prod: any) => {
            const priceStr = prod.price
              ? `$${Number(prod.price).toLocaleString("es-AR")}`
              : "";
            const imageSrc =
              prod.imagen ||
              prod.images?.[0] ||
              "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80";

            return `
              <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; margin: 8px 1%; display: inline-block; width: 47%; vertical-align: top; box-sizing: border-box; text-align: center; padding-bottom: 12px;">
                <img src="${imageSrc}" alt="${prod.name}" style="width: 100%; height: 130px; object-fit: cover; display: block;" />
                <div style="padding: 10px 8px 4px 8px;">
                  <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: #1f2937; height: 34px; overflow: hidden; line-height: 1.3;">${prod.name}</h4>
                  ${priceStr ? `<p style="margin: 0; font-size: 14px; font-weight: 700; color: #db2777;">${priceStr}</p>` : ""}
                </div>
              </div>
            `;
          })
          .join(" ");
      } else {
        cardsHtml = `<p style="text-align:center; color:#6b7280; font-style:italic;">(Cargando los 4 productos más recientes...)</p>`;
      }

      const gridHtml = `<div style="margin: 15px 0; text-align: center;">${cardsHtml}</div>`;
      raw = raw.replace(/{productos_recientes}/gi, gridHtml).replace(/{producto_reciente}/gi, gridHtml);
    }

    // Reemplazar {catalogo} o {link_tienda}
    if (raw.includes("{catalogo}") || raw.includes("{link_tienda}")) {
      const buttonHtml = `
        <div style="text-align: center; margin: 20px 0;">
          <a href="${storeUrl || "#"}" target="_blank" style="display: inline-block; background-color: #db2777; color: #ffffff; padding: 12px 26px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 14px;">
            Ver catálogo completo en la tienda →
          </a>
        </div>
      `;
      raw = raw.replace(/{catalogo}/gi, buttonHtml).replace(/{link_tienda}/gi, buttonHtml);
    }

    // Reemplazar {tienda}
    raw = raw.replace(/{tienda}/gi, storeName);

    return raw;
  };

  const previewHtml = buildEmailTemplate({
    storeName,
    content: getProcessedContentForPreview(),
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
            Usa las etiquetas inteligentes como <strong>{"{productos_recientes}"}</strong> para cargar tus productos automáticamente.
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
              Configura los destinatarios, variables e imágenes de tu correo.
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
                      selectedLeadIds.length === 0
                        ? "opacity-50 cursor-not-allowed"
                        : ""
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

              {/* Variables Rápidas (Shortcodes) */}
              <div className="space-y-2.5 border p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border-purple-200">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    Etiquetas Variables (Insertar al hacer clic)
                  </Label>
                  <span className="text-[10px] text-purple-600 font-medium">Haz clic para agregar</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertTag("{productos_recientes}")}
                    className="h-7 text-xs bg-white border-purple-300 text-purple-700 hover:bg-purple-100 font-mono flex items-center gap-1"
                  >
                    <Package className="h-3.5 w-3.5 text-purple-600" />
                    + {"{productos_recientes}"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertTag("{catalogo}")}
                    className="h-7 text-xs bg-white border-pink-300 text-pink-700 hover:bg-pink-100 font-mono flex items-center gap-1"
                  >
                    <ShoppingBag className="h-3.5 w-3.5 text-pink-600" />
                    + {"{catalogo}"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertTag("{tienda}")}
                    className="h-7 text-xs bg-white border-indigo-300 text-indigo-700 hover:bg-indigo-100 font-mono flex items-center gap-1"
                  >
                    <StoreIcon className="h-3.5 w-3.5 text-indigo-600" />
                    + {"{tienda}"}
                  </Button>
                </div>
              </div>

              {/* Plantillas Guardadas por el usuario */}
              <div className="space-y-2 border p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Bookmark className="h-4 w-4 text-primary" />
                    Mis Plantillas Guardadas
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-primary hover:bg-primary/10 font-semibold p-1"
                    onClick={() => setShowSaveInput(!showSaveInput)}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Guardar esta plantilla
                  </Button>
                </div>

                {/* Input para guardar plantilla */}
                {showSaveInput && (
                  <div className="flex items-center gap-2 pt-1 pb-1">
                    <Input
                      placeholder="Nombre de tu plantilla (ej: Mis Novedades)"
                      className="h-8 text-xs bg-white"
                      value={templateSaveName}
                      onChange={(e) => setTemplateSaveName(e.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs bg-primary text-white shrink-0"
                      onClick={handleSaveTemplate}
                    >
                      Guardar
                    </Button>
                  </div>
                )}

                {/* Lista de plantillas guardadas */}
                {savedTemplates.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground font-normal italic pt-1">
                    Aún no tienes plantillas guardadas. Redacta tu mensaje y haz clic en "Guardar esta plantilla" para reutilizarla cuando quieras.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {savedTemplates.map((tmpl) => (
                      <div
                        key={tmpl.id}
                        className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-300 px-2 py-1 rounded text-xs hover:border-primary cursor-pointer shadow-2xs"
                        onClick={() => handleLoadSavedTemplate(tmpl)}
                        title="Hacer clic para cargar esta plantilla"
                      >
                        <span className="font-medium text-slate-900 dark:text-slate-100 max-w-[140px] truncate">
                          {tmpl.name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedTemplate(tmpl.id, e)}
                          className="text-muted-foreground hover:text-rose-600 p-0.5 rounded"
                          title="Eliminar plantilla"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Asunto */}
              <div className="space-y-2">
                <Label htmlFor="subject">Asunto del Correo *</Label>
                <Input
                  id="subject"
                  placeholder="Ej: ¡Descubre nuestras novedades de la semana!"
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
                    {uploadingImage
                      ? "Subiendo a Cloudinary..."
                      : "Subir Imagen (Cloudinary)"}
                  </Button>
                </div>
              </div>

              {/* Mensaje */}
              <div className="space-y-2">
                <Label htmlFor="content">
                  {isHtmlMode
                    ? "Contenido del Correo (soporta HTML y variables) *"
                    : "Contenido / Mensaje *"}
                </Label>
                <Textarea
                  id="content"
                  placeholder={
                    "Hola! Te invitamos a conocer nuestras últimas novedades:\n\n{productos_recientes}\n\n{catalogo}"
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
                <Button
                  type="submit"
                  disabled={sending}
                  className="flex items-center gap-2"
                >
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
                Transformación en tiempo real
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
    <Suspense
      fallback={
        <div className="p-6 text-center text-muted-foreground">
          Cargando editor de novedades...
        </div>
      }
    >
      <NovedadesFormContent />
    </Suspense>
  );
}
