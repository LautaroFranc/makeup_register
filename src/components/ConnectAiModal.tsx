"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  CheckCircle2,
  Copy,
  ExternalLink,
  Laptop,
  Globe,
  Bot,
  Loader2,
  Cpu,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface ConnectAiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectAiModal({ open, onOpenChange }: ConnectAiModalProps) {
  const { toast } = useToast();
  const [loadingClaude, setLoadingClaude] = useState(false);
  const [claudeStatus, setClaudeStatus] = useState<any>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
    if (open) {
      checkClaudeStatus();
    }
  }, [open]);

  const checkClaudeStatus = async () => {
    try {
      const res = await fetch("/api/mcp/setup-claude");
      const data = await res.json();
      if (data.success) {
        setClaudeStatus(data);
      }
    } catch {}
  };

  const handleConnectClaudeAuto = async () => {
    setLoadingClaude(true);
    try {
      const res = await fetch("/api/mcp/setup-claude", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "¡Conectado exitosamente!",
          description: "Claude Desktop ya está vinculado automáticamente con Nova Insumos.",
        });
        await checkClaudeStatus();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast({
        title: "Error al conectar",
        description: err.message || "No se pudo escribir la configuración.",
        variant: "destructive",
      });
    } finally {
      setLoadingClaude(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado al portapapeles",
      description: `${label} copiado con éxito.`,
    });
  };

  const mcpWebUrl = `${origin || "http://localhost:3000"}/api/mcp`;
  const openApiUrl = `${origin || "http://localhost:3000"}/api/mcp/openapi`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl bg-gradient-to-b from-card to-background border-border/80 shadow-2xl p-6 overflow-hidden">
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 rounded-xl text-primary ring-1 ring-primary/20">
                <Sparkles className="w-5 h-5 animate-pulse text-amber-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  Conectar Asistente IA
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[11px] font-semibold">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Nova Insumos
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Gestiona tu catálogo, stock, combos y análisis directamente desde ChatGPT o Claude.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="claude-desktop" className="mt-2">
          <TabsList className="grid grid-cols-3 w-full bg-muted/60 p-1">
            <TabsTrigger value="claude-desktop" className="text-xs flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5" />
              Claude Desktop
            </TabsTrigger>
            <TabsTrigger value="chatgpt" className="text-xs flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-emerald-500" />
              ChatGPT (GPTs)
            </TabsTrigger>
            <TabsTrigger value="claude-web" className="text-xs flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-orange-500" />
              Claude Web
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: CLAUDE DESKTOP (1-CLICK AUTOMÁTICO) */}
          <TabsContent value="claude-desktop" className="space-y-4 pt-3">
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-primary" />
                    Conexión Automática en 1 Clic
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    El sistema detectará tu aplicación de Claude Desktop en Windows e inyectará la configuración de Nova Insumos automáticamente.
                  </p>
                </div>
                {claudeStatus?.isConfigured && (
                  <Badge className="bg-emerald-500 text-white flex items-center gap-1 text-[11px] shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
                  </Badge>
                )}
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                <Button
                  onClick={handleConnectClaudeAuto}
                  disabled={loadingClaude}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-9 px-4 shadow-sm"
                >
                  {loadingClaude ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Vinculando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-2 text-amber-300" />
                      {claudeStatus?.isConfigured ? "Re-conectar / Actualizar" : "Conectar Claude Automáticamente"}
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => {
                    window.location.href = "claude://";
                  }}
                >
                  Abrir Claude Desktop ↗
                </Button>
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border/50 text-xs text-muted-foreground space-y-1.5">
              <div className="font-medium text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ¿Qué puede hacer Claude en Nova Insumos?
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-1">
                <li>Buscar productos por nombre, marca, categoría y stock.</li>
                <li>Crear artículos nuevos con secciones enriquecidas (Resultados, Modo de uso, Ingredientes).</li>
                <li>Generar kits y combos automáticos calculando ahorros reales.</li>
                <li>Analizar valorización a costo, precio de venta y quiebres de stock.</li>
              </ul>
            </div>
          </TabsContent>

          {/* TAB 2: CHATGPT (CUSTOM GPTS & ACTIONS) */}
          <TabsContent value="chatgpt" className="space-y-4 pt-3">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Bot className="w-4 h-4 text-emerald-500" />
                    Conectar con ChatGPT (Acciones de GPTs)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Permite a ChatGPT consultar tu inventario y crear productos mediante una Acción de GPTs con especificación OpenAPI.
                  </p>
                </div>
              </div>

              {/* Botón de apertura y copiar */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  onClick={() => window.open("https://chatgpt.com/gpts/editor", "_blank")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-2" />
                  Abrir Editor de GPTs en ChatGPT
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => copyToClipboard(openApiUrl, "URL de OpenAPI")}
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copiar URL de OpenAPI
                </Button>
              </div>
            </div>

            {/* Pasos visuales */}
            <div className="p-3 bg-muted/40 rounded-lg border border-border/50 text-xs space-y-2">
              <div className="font-semibold text-foreground">Pasos para activar en ChatGPT (1 minuto):</div>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Haz clic en <strong className="text-foreground">"Abrir Editor de GPTs"</strong>.</li>
                <li>Ve a la pestaña <strong className="text-foreground">Configure</strong> y abajo de todo haz clic en <strong className="text-foreground">Create new action</strong>.</li>
                <li>Haz clic en <strong className="text-foreground">Import from URL</strong> y pega la URL de OpenAPI copiada.</li>
                <li>¡Listo! ChatGPT importará automáticamente todas las herramientas de Nova Insumos.</li>
              </ol>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border border-border/40 text-xs">
              <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[420px]">
                {openApiUrl}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => copyToClipboard(openApiUrl, "URL de OpenAPI")}
              >
                <Copy className="w-3 h-3 mr-1" /> Copiar
              </Button>
            </div>
          </TabsContent>

          {/* TAB 3: CLAUDE WEB */}
          <TabsContent value="claude-web" className="space-y-4 pt-3">
            <div className="p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Globe className="w-4 h-4 text-orange-500" />
                    Conector Remoto para Claude Web (claude.ai)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Para usar Claude en la nube desde el navegador conectándose a tu tienda desplegada en Vercel.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  onClick={() => window.open("https://claude.ai", "_blank")}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold h-9 px-4 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-2" />
                  Abrir Claude.ai ↗
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => copyToClipboard(mcpWebUrl, "URL del conector MCP")}
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copiar URL de Conector MCP
                </Button>
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border/50 text-xs space-y-2">
              <div className="font-semibold text-foreground">Cómo agregar el conector en Claude Web:</div>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Ingresa a <strong className="text-foreground">claude.ai</strong> y dirígete a <strong className="text-foreground">Settings &gt; Connectors</strong> (o en un Proyecto).</li>
                <li>Selecciona <strong className="text-foreground">Add Custom Connector</strong>.</li>
                <li>Pega la URL de tu conector MCP desplegado.</li>
              </ol>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border border-border/40 text-xs">
              <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[420px]">
                {mcpWebUrl}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => copyToClipboard(mcpWebUrl, "URL del conector MCP")}
              >
                <Copy className="w-3 h-3 mr-1" /> Copiar
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
