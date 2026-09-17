"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Send,
  ArrowLeft,
  Mail,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

function NovedadesFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

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
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (targetParam === "selected" && idsParam) {
      setTargetType("selected");
      setSelectedLeadIds(idsParam.split(","));
    }
  }, [targetParam, idsParam]);

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

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-3xl space-y-6">
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
            <Sparkles className="h-6 w-6 text-primary" /> Redactar Novedad
          </h1>
          <p className="text-muted-foreground text-sm">
            Envía anuncios, ofertas o promociones por correo electrónico a tus clientes.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Configuración de Envío
          </CardTitle>
          <CardDescription>
            Selecciona a quiénes deseas enviar esta novedad.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-6">
            {/* Destinatarios */}
            <div className="space-y-3 border p-4 rounded-lg bg-muted/20">
              <Label className="font-semibold text-sm">Destinatarios</Label>
              <div className="space-y-3">
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
                    Enviar a <strong>TODOS</strong> los clientes con email registrado
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
                    Enviar solo a los <strong>clientes seleccionados</strong> ({selectedLeadIds.length})
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

            {/* Mensaje */}
            <div className="space-y-2">
              <Label htmlFor="content">Mensaje / Novedad *</Label>
              <Textarea
                id="content"
                placeholder="Escribe aquí el contenido de tu mensaje o novedad..."
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            {/* Botones de acción */}
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
                {sending ? "Enviando correos..." : "Enviar Novedades"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NovedadesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Cargando formulario de novedades...</div>}>
      <NovedadesFormContent />
    </Suspense>
  );
}
