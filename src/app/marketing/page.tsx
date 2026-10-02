"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Megaphone,
  Users,
  Eye,
  UserCheck,
  Plus,
  RefreshCw,
  Filter,
  AlertTriangle,
} from "lucide-react";

interface CampaignRow {
  _id: string;
  name: string;
  channel: string;
  utmMedium?: string;
  status: "activa" | "pausada" | "terminada";
  notes?: string;
  createdAt: string;
  leads: number;
  clientes: number;
  vistas: number;
  conversion: number | null;
}

interface CampaignsResponse {
  success: boolean;
  store: { _id: string; name: string; slug: string };
  totals: { campanas: number; leads: number; clientes: number; vistas: number };
  campaigns: CampaignRow[];
}

const CHANNELS = [
  "instagram",
  "facebook",
  "tiktok",
  "whatsapp",
  "google",
  "email",
  "presencial",
  "otro",
];

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  activa: "default",
  pausada: "secondary",
  terminada: "outline",
};

// Cada KPI explica qué es y qué revisar si cae. Sin esto, el número
// no sirve para decidir nada.
const KPI_HELP: Record<string, string> = {
  leads: "Cuántas personas dejaron su contacto en esta campaña. Si cae, revisá el mensaje del anuncio o el CTA.",
  clientes: "Leads que llegaron a estado 'cliente'. Si es 0 con muchos leads, el problema está en el seguimiento, no en la publicidad.",
  vistas: "Visitas a productos de la tienda desde esta campaña. Si es 0, revisá que los enlaces lleven las UTM.",
  conversion: "Porcentaje de visitas que dejaron contacto. Si es muy bajo, el problema suele estar en la página o el formulario.",
};

export default function MarketingPage() {
  const { toast } = useToast();
  const [data, setData] = useState<CampaignsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("todas");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    channel: "instagram",
    utmMedium: "",
    notes: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/marketing/campaigns?status=${statusFilter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "No se pudieron cargar las campañas");
      }

      setData(json);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({
        title: "Falta el nombre",
        description: "Poné un nombre para identificar la campaña.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("/api/marketing/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "No se pudo crear la campaña");
      }

      toast({ title: "Campaña creada", description: form.name });
      setDialogOpen(false);
      setForm({ name: "", channel: "instagram", utmMedium: "", notes: "" });
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

  const totals = data?.totals;
  const campaigns = data?.campaigns || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            Marketing
          </h1>
          <p className="text-sm text-muted-foreground">
            {data?.store
              ? `Campañas de ${data.store.name}`
              : "Campañas y atribución"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/marketing/embudo">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Ver embudo
          </Button>
        </Link>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva campaña
          </Button>
        </div>
      </div>

      {campaigns.length === 0 && !loading && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Todavía no hay campañas registradas</p>
              <p className="text-muted-foreground mt-1">
                Las campañas se crean solas cuando alguien llega a tu tienda con
                parámetros UTM. Para anotarlas a mano (WhatsApp, venta
                presencial), usá &quot;Nueva campaña&quot;.
              </p>
              <p className="text-muted-foreground mt-2">
                Ejemplo de enlace:{" "}
                <code className="text-xs bg-white px-1.5 py-0.5 rounded border">
                  ?utm_source=instagram&amp;utm_medium=social&amp;utm_campaign=navidad
                </code>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title="Campañas"
          value={totals?.campanas ?? 0}
          icon={<Megaphone className="h-4 w-4" />}
          help="Cuántas campañas distintas se registraron."
        />
        <KpiCard
          title="Vistas"
          value={totals?.vistas ?? 0}
          icon={<Eye className="h-4 w-4" />}
          help={KPI_HELP.vistas}
        />
        <KpiCard
          title="Leads"
          value={totals?.leads ?? 0}
          icon={<Users className="h-4 w-4" />}
          help={KPI_HELP.leads}
        />
        <KpiCard
          title="Clientes"
          value={totals?.clientes ?? 0}
          icon={<UserCheck className="h-4 w-4" />}
          help={KPI_HELP.clientes}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Campañas</CardTitle>
              <CardDescription>
                Atribución de primer contacto: el canal queda fijado en la
                primera visita con UTM y no se sobreescribe.
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="activa">Activas</SelectItem>
                <SelectItem value="pausada">Pausadas</SelectItem>
                <SelectItem value="terminada">Terminadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Cargando campañas...
            </p>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Sin campañas para este filtro.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaña</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Vistas</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Clientes</TableHead>
                  <TableHead className="text-right">Vista → Lead</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/marketing/campaigns/${c._id}`}
                        className="hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize">{c.channel}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[c.status]}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{c.vistas}</TableCell>
                    <TableCell className="text-right">{c.leads}</TableCell>
                    <TableCell className="text-right">{c.clientes}</TableCell>
                    <TableCell className="text-right">
                      {c.conversion !== null ? `${c.conversion}%` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva campaña</DialogTitle>
            <DialogDescription>
              Para canales que no traen UTM: WhatsApp, venta presencial,
              recomendaciones. Si la campaña viene de un anuncio con UTM, se
              crea sola.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="Ej: Promotion Navidad"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Canal</label>
              <Select
                value={form.channel}
                onValueChange={(v) => setForm({ ...form, channel: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Notas (opcional)
              </label>
              <Input
                value={form.notes}
                onChange={(e) =>
                  setForm({ ...form, notes: e.target.value })
                }
                placeholder="Ej: 20 unidades, publicado el 01/12"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Guardando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  help,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  help: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5">
          {icon}
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          {help}
        </p>
      </CardContent>
    </Card>
  );
}
