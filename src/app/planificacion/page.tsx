"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { buildUtmQuery } from "@/lib/utm";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Trash2,
  Pencil,
  Facebook,
  MessageCircle,
  Lightbulb,
  Info,
  Send,
  Link2,
} from "lucide-react";

interface Piece {
  _id: string;
  title: string;
  copy: string;
  notes?: string;
  network: "facebook" | "whatsapp";
  format: string;
  status: "idea" | "listo" | "programado" | "publicado" | "descartado";
  scheduledFor: string | null;
  publishedAt: string | null;
  results: { reach: number; interactions: number };
  // Poblado desde el servidor: la foto y el nombre real del producto, para
  // ver la miniatura sin ir a buscarla.
  product?: { _id: string; name: string; image?: string; sellPrice?: string } | null;
  promotion?: { _id: string; name: string; type: string } | null;
  campaign?: { _id: string; name: string; channel: string } | null;
  // Leads/clientes/vistas que trajo esta pieza, vía su campaña.
  metrics?: { leads: number; clientes: number; vistas: number } | null;
}

interface Idea {
  key: string;
  title: string;
  network: "facebook" | "whatsapp";
  format: string;
  copy: string;
  rationale: string;
  product?: string;
  promotion?: string;
  suggestedDayOffset: number;
  alreadyPlanned: boolean;
}

const NETWORK_META: Record<
  string,
  { label: string; Icon: any; chip: string; edge: string }
> = {
  facebook: {
    label: "Facebook",
    Icon: Facebook,
    chip: "bg-blue-100 text-blue-800",
    edge: "border-l-blue-500",
  },
  whatsapp: {
    label: "WhatsApp",
    Icon: MessageCircle,
    chip: "bg-green-100 text-green-800",
    edge: "border-l-green-600",
  },
};

const STATUS_META: Record<string, { label: string; variant: any }> = {
  idea: { label: "Idea", variant: "outline" },
  listo: { label: "Listo", variant: "secondary" },
  programado: { label: "Programado", variant: "default" },
  publicado: { label: "Publicado", variant: "default" },
  descartado: { label: "Descartado", variant: "outline" },
};

const FORMATS = [
  { value: "post", label: "Post" },
  { value: "reel", label: "Reel" },
  { value: "video", label: "Video" },
  { value: "story", label: "Historia" },
  { value: "catalogo", label: "Catálogo" },
  { value: "mensaje", label: "Mensaje" },
];

const STATUSES = [
  { value: "idea", label: "Idea" },
  { value: "listo", label: "Listo para publicar" },
  { value: "programado", label: "Programado" },
  { value: "publicado", label: "Publicado" },
  { value: "descartado", label: "Descartado" },
];

// --- helpers de fecha (la semana arranca el lunes) ---

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function PlanificacionPage() {
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [backlog, setBacklog] = useState<Piece[]>([]);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [whatsappDisplay, setWhatsappDisplay] = useState<string>("");
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<Piece | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const [genOpen, setGenOpen] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const from = toISODate(weekStart);
  const to = toISODate(addDays(weekStart, 6));

  const loadData = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const [weekRes, backRes] = await Promise.all([
        fetch(`/api/content?from=${from}&to=${to}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/content?unscheduled=true`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const weekJson = await weekRes.json();
      const backJson = await backRes.json();

      if (!weekRes.ok || !weekJson.success) {
        throw new Error(weekJson.error || "No se pudo cargar la planificación");
      }

      setPieces(weekJson.pieces || []);
      setBacklog(backJson.success ? backJson.pieces || [] : []);
      setWhatsapp(weekJson.whatsapp || null);
      setWhatsappDisplay(weekJson.whatsappDisplay || "");
      setStoreUrl(weekJson.storeUrl || null);
      setStoreSlug(weekJson.storeSlug || null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [from, to, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const byDay = useMemo(() => {
    const map: Record<string, Piece[]> = {};
    for (const p of pieces) {
      if (!p.scheduledFor) continue;
      const key = toISODate(new Date(p.scheduledFor));
      (map[key] = map[key] || []).push(p);
    }
    return map;
  }, [pieces]);

  const isCurrentWeek = toISODate(weekStart) === toISODate(startOfWeek(new Date()));

  // Base del link de medición: la tienda real si está configurada, si no el
  // preview interno. La página se prerenderiza en el server, donde window no
  // existe, así que el origin se resuelve solo en el cliente.
  const baseStoreUrl = useMemo(() => {
    if (storeUrl) return storeUrl;
    if (storeSlug && typeof window !== "undefined") {
      return `${window.location.origin}/store/${storeSlug}`;
    }
    return "";
  }, [storeUrl, storeSlug]);

  const measureUrl = useMemo(() => {
    if (!editing?.campaign?.name) return "";
    const query = buildUtmQuery({
      source: editing.network,
      medium: "organic",
      campaign: editing.campaign.name,
    });
    return baseStoreUrl ? `${baseStoreUrl}${baseStoreUrl.includes("?") ? "&" : "?"}${query}` : query;
  }, [editing, baseStoreUrl]);

  const weekLabel = `${weekStart.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} – ${addDays(weekStart, 6).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copiado", description: label });
    } catch {
      toast({
        title: "No se pudo copiar",
        description: "Tu navegador bloqueó el portapapeles: copialo a mano.",
        variant: "destructive",
      });
    }
  };

  const openNew = (day?: Date) => {
    setForm({
      title: "",
      copy: "",
      notes: "",
      network: "facebook",
      format: "post",
      status: "idea",
      scheduledFor: day ? toISODate(day) : "",
      results: { reach: 0, interactions: 0 },
    });
    setEditing(null);
    setEditOpen(true);
  };

  const openEdit = (piece: Piece) => {
    setForm({
      title: piece.title,
      copy: piece.copy,
      notes: piece.notes || "",
      network: piece.network,
      format: piece.format,
      status: piece.status,
      scheduledFor: piece.scheduledFor
        ? toISODate(new Date(piece.scheduledFor))
        : "",
      reach: piece.results?.reach ?? 0,
      interactions: piece.results?.interactions ?? 0,
    });
    setEditing(piece);
    setEditOpen(true);
  };

  const savePiece = async () => {
    if (!form.title?.trim()) {
      toast({
        title: "Falta el título",
        description: "Poné un título para reconocer la pieza.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const token = localStorage.getItem("token");
    const payload = {
      title: form.title,
      copy: form.copy,
      notes: form.notes,
      network: form.network,
      format: form.format,
      status: form.status,
      // Sin fecha = idea suelta, queda en el backlog.
      scheduledFor: form.scheduledFor
        ? new Date(`${form.scheduledFor}T10:00:00`).toISOString()
        : null,
      results: {
        reach: Number(form.reach) || 0,
        interactions: Number(form.interactions) || 0,
      },
    };

    try {
      const res = await fetch(
        editing ? "/api/content" : "/api/content",
        {
          method: editing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editing ? { id: editing._id, ...payload } : payload),
        }
      );
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "No se pudo guardar");
      }

      toast({
        title: editing ? "Actualizado" : "Guardado",
        description: form.title,
      });
      setEditOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deletePiece = async (piece: Piece) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/content?id=${piece._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "No se pudo eliminar");
      toast({ title: "Eliminado", description: piece.title });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateIdeas = async () => {
    setGenerating(true);
    setGenOpen(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "No se pudieron generar");

      setIdeas(json.ideas || []);
      // Preselecciona solo lo que todavía no tenés cargado, así no duplica.
      setSelected(
        new Set(
          (json.ideas || [])
            .filter((i: Idea) => !i.alreadyPlanned)
            .map((i: Idea) => i.key)
        )
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setGenOpen(false);
    } finally {
      setGenerating(false);
    }
  };

  const saveSelectedIdeas = async () => {
    const token = localStorage.getItem("token");
    const chosen = ideas.filter((i) => selected.has(i.key));
    if (chosen.length === 0) {
      toast({
        title: "No seleccionaste ninguna",
        description: "Marcá al menos una idea para guardarla.",
      });
      return;
    }

    setSaving(true);
    try {
      for (const idea of chosen) {
        const day = addDays(new Date(), idea.suggestedDayOffset);
        await fetch("/api/content", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: idea.title,
            copy: idea.copy,
            network: idea.network,
            format: idea.format,
            status: idea.copy ? "listo" : "idea",
            scheduledFor: new Date(
              `${toISODate(day)}T10:00:00`
            ).toISOString(),
            product: idea.product,
            promotion: idea.promotion,
          }),
        });
      }

      toast({
        title: `${chosen.length} idea${chosen.length === 1 ? "" : "s"} guardada${
          chosen.length === 1 ? "" : "s"
        }`,
        description: "Ya están en el calendario. Revisá los textos y ajustá lo que quieras.",
      });
      setGenOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const scheduledCount = pieces.filter((p) => p.status !== "descartado").length;
  const publishedCount = pieces.filter((p) => p.status === "publicado").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Planificación
          </h1>
          <p className="text-sm text-muted-foreground">
            Qué publicás, cuándo y en qué red. Facebook y WhatsApp.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateIdeas}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generar ideas
          </Button>
          <Button onClick={() => openNew()}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva pieza
          </Button>
        </div>
      </div>

      {/* Resumen de la semana: si no hay nada cargado, el vacío hay que verlo. */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Piezas en la semana</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Publicadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publishedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Ideas sin fecha</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backlog.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-600" />
              Botón de WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            {whatsapp ? (
              <p className="text-sm text-muted-foreground">
                El botón de cada tarjeta abre WhatsApp con{" "}
                <strong className="text-foreground">{whatsappDisplay}</strong>{" "}
                y el texto ya escrito. Cambialo en{" "}
                <strong>Tiendas → tu tienda → Contacto</strong>.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay número de WhatsApp cargado, así que el botón no
                aparece. Cargalo en{" "}
                <strong>Tiendas → tu tienda → Contacto</strong> y las piezas
                con texto listo se van a poder mandar directo.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>Semana del {weekLabel}</CardTitle>
              <CardDescription>
                Los mensajes de WhatsApp van aparte de los posts: no son un
                feed, son envíos a tu lista.
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekStart(addDays(weekStart, -7))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {!isCurrentWeek && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setWeekStart(startOfWeek(new Date()))}
                >
                  Hoy
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekStart(addDays(weekStart, 7))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Cargando...
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {days.map((day, i) => {
                const key = toISODate(day);
                const dayPieces = byDay[key] || [];
                const isToday = key === toISODate(new Date());

                return (
                  <div key={key} className="space-y-2">
                    <div
                      className={`flex items-center justify-between pb-1 border-b ${
                        isToday ? "border-primary" : "border-muted"
                      }`}
                    >
                      <span
                        className={`text-xs font-semibold ${
                          isToday ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {WEEKDAYS[i]} {day.getDate()}
                      </span>
                      <button
                        onClick={() => openNew(day)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Agregar en este día"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {dayPieces.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground/60 pt-1">
                        —
                      </p>
                    ) : (
                      dayPieces.map((p) => (
                        <PieceCard
                          key={p._id}
                          piece={p}
                          onEdit={openEdit}
                          onDelete={deletePiece}
                          whatsapp={whatsapp}
                          whatsappDisplay={whatsappDisplay}
                        />
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Ideas sin fecha
          </CardTitle>
          <CardDescription>
            Lo que todavía no sabés cuándo publicar. Cuando sepas el día,
            editá la pieza y asignás la fecha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backlog.length === 0 ? (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>No hay ideas sueltas.</p>
              <p className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                Usá <strong>Generar ideas</strong>: arma publicaciones a partir
                de tus productos, promociones y descuentos reales.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {backlog.map((p) => (
                <PieceCard
                  key={p._id}
                  piece={p}
                  onEdit={openEdit}
                  onDelete={deletePiece}
                  whatsapp={whatsapp}
                  whatsappDisplay={whatsappDisplay}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* --- Editor --- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar pieza" : "Nueva pieza"}</DialogTitle>
            <DialogDescription>
              Dejá la fecha vacía si todavía no sabés cuándo la publicás.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Título interno</Label>
              <Input
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ej: Post del labial rojo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Red</Label>
                <Select
                  value={form.network}
                  onValueChange={(v) => setForm({ ...form, network: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Formato</Label>
                <Select
                  value={form.format}
                  onValueChange={(v) => setForm({ ...form, format: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={form.scheduledFor || ""}
                  onChange={(e) =>
                    setForm({ ...form, scheduledFor: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Texto para publicar</Label>
              <Textarea
                value={form.copy || ""}
                onChange={(e) => setForm({ ...form, copy: e.target.value })}
                rows={7}
                placeholder="Acá va el texto que vas a copiar y pegar."
              />
            </div>

            {editing?.campaign?.name && (
              <div className="space-y-2 rounded-md border border-dashed p-3">
                <Label className="flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" />
                  Link para medir esta pieza
                </Label>
                <code className="block text-[11px] bg-muted p-2 rounded break-all">
                  {measureUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(measureUrl, "Link de medición copiado")
                  }
                >
                  Copiar link
                </Button>
                <p className="text-xs text-muted-foreground">
                  Ponelo en tu bio, en el post o en un link-in-bio. Con eso la
                  app sabe cuántas visitas y cuántos leads trajo{" "}
                  <strong>esta</strong> pieza y no otra.
                  {editing.metrics && editing.metrics.vistas + editing.metrics.leads > 0
                    ? ` Ahora mismo: ${editing.metrics.vistas} visitas, ${editing.metrics.leads} leads, ${editing.metrics.clientes} clientes.`
                    : " Todavía no registra visitas: es normal hasta que lo publiques y alguien entre por el link."}
                </p>
              </div>
            )}

            {form.status === "publicado" && (
              <div className="grid grid-cols-2 gap-4 rounded-md border border-dashed p-3">
                <div className="space-y-2">
                  <Label>Alcance</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.reach ?? 0}
                    onChange={(e) => setForm({ ...form, reach: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Interacciones</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.interactions ?? 0}
                    onChange={(e) =>
                      setForm({ ...form, interactions: e.target.value })
                    }
                  />
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">
                  Los cargás a mano. No hay API de Facebook conectada, así que
                  este número no se llena solo.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={form.notes || ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Ej: pedir foto del producto antes de publicar"
              />
            </div>
          </div>

          <DialogFooter>
            {editing && (
              <Button
                variant="outline"
                className="mr-auto text-destructive"
                onClick={() => {
                  deletePiece(editing);
                  setEditOpen(false);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={savePiece} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Generador de ideas --- */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Ideas desde tus datos</DialogTitle>
            <DialogDescription>
              Generadas con tus productos, promociones y descuentos reales.
              Marcá las que quieras y se acomodan solas en el calendario.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
            {generating ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Generando...
              </p>
            ) : ideas.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center space-y-2">
                <p>No pude armar ideas porque no hay datos.</p>
                <p>
                  Cargá productos con stock y promociones activas en
                  &quot;Productos&quot; y &quot;Promociones&quot;, y volvé a
                  intentar.
                </p>
              </div>
            ) : (
              ideas.map((idea) => {
                const meta = NETWORK_META[idea.network];
                const isOn = selected.has(idea.key);

                return (
                  <div
                    key={idea.key}
                    className={`rounded-lg border p-3 ${meta.edge} border-l-4 ${
                      isOn ? "bg-muted/40" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={isOn}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(idea.key);
                          else next.delete(idea.key);
                          setSelected(next);
                        }}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{idea.title}</span>
                          <span
                            className={`text-[11px] px-1.5 py-0.5 rounded ${meta.chip}`}
                          >
                            {meta.label}
                          </span>
                          {idea.alreadyPlanned && (
                            <Badge variant="outline">ya la tenés</Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <Info className="h-3 w-3 mt-0.5 shrink-0" />
                          {idea.rationale}
                        </p>

                        <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap font-sans">
                          {idea.copy}
                        </pre>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveSelectedIdeas} disabled={saving || generating}>
              {saving
                ? "Guardando..."
                : `Guardar ${selected.size} idea${selected.size === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PieceCard({
  piece,
  onEdit,
  onDelete,
  whatsapp,
  whatsappDisplay,
}: {
  piece: Piece;
  onEdit: (p: Piece) => void;
  onDelete: (p: Piece) => void;
  whatsapp: string | null;
  whatsappDisplay: string;
}) {
  const meta = NETWORK_META[piece.network];
  const status = STATUS_META[piece.status];
  const Icon = meta.Icon;
  const done = piece.status === "publicado";
  const dropped = piece.status === "descartado";

  // El link solo tiene sentido si hay texto listo y un número configurado.
  // Se muestra en ambas redes: el link abre WhatsApp con el mensaje
  // precargado, que es lo que se usa tanto para la lista como para
  // responder una consulta puntual.
  const waLink = buildWhatsappLink(whatsapp, piece.copy);
  const canSend = !!waLink && !!piece.copy.trim() && !dropped && piece.status !== "idea";

  return (
    <div
      className={`rounded-md border border-l-4 p-2 text-xs space-y-1.5 ${
        meta.edge
      } ${dropped ? "opacity-50" : "bg-card"}`}
    >
      <div className="flex items-start gap-2">
        <ProductThumb piece={piece} />

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-1">
            <span
              className={`font-medium leading-tight ${done ? "line-through" : ""}`}
            >
              {piece.title}
            </span>
            <Icon className="h-3 w-3 shrink-0 opacity-60" />
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant={status.variant} className="text-[10px]">
              {status.label}
            </Badge>
            {piece.results?.reach > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {piece.results.reach} alcance
              </span>
            )}
          </div>

          {/* Lo que trajo la pieza de verdad: visitas, leads y clientes que
              entraron por el link de esta campaña. */}
          {piece.metrics &&
            (piece.metrics.vistas > 0 || piece.metrics.leads > 0) && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span title="Visitas a productos con el link de esta pieza">
                  {piece.metrics.vistas} visitas
                </span>
                <span>{piece.metrics.leads} leads</span>
                {piece.metrics.clientes > 0 && (
                  <span className="text-green-700 font-medium">
                    {piece.metrics.clientes} clientes
                  </span>
                )}
              </div>
            )}

          <div className="flex items-center gap-2 pt-0.5">
            {canSend && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title={`Abrir WhatsApp con el mensaje listo (${whatsappDisplay})`}
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-green-600 text-white hover:bg-green-700"
              >
                <Send className="h-2.5 w-2.5" />
                WhatsApp
              </a>
            )}
            <button
              onClick={() => onEdit(piece)}
              className="text-muted-foreground hover:text-foreground"
              title="Editar"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={() => onDelete(piece)}
              className="text-muted-foreground hover:text-destructive"
              title="Eliminar"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Miniatura del producto vinculado. Usa <img> y no next/image a propósito:
// las imágenes vienen de hosts que el usuario carga (Cloudinary y otros) y
// next.config.ts solo tiene dos dominios permitidos; con next/image
// anything fuera de esa lista no renderiza.
function ProductThumb({ piece }: { piece: Piece }) {
  const image = piece.product?.image;
  if (!image) return null;

  return (
    <div className="shrink-0 w-9 h-9 rounded border overflow-hidden bg-muted relative">
      <img
        src={image}
        alt={piece.product?.name || ""}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
}