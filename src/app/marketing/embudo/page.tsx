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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Filter,
  Eye,
  Users,
  UserCheck,
  Info,
  AlertTriangle,
  TrendingDown,
} from "lucide-react";

interface Etapa {
  key: string;
  label: string;
  valor: number;
  ayuda: string;
}

interface Alerta {
  key: string;
  valor: number;
  titulo: string;
  texto: string;
}

interface Campana {
  id: string;
  name: string;
  channel: string;
  vistas: number;
  leads: number;
  clientes: number;
}

interface FunnelData {
  success: boolean;
  days: number;
  etapas: Etapa[];
  tasas: {
    vistasALeads: number | null;
    leadsAContactados: number | null;
    contactadosAInteresados: number | null;
    interesadosAClientes: number | null;
  };
  alertas: Alerta[];
  porCampana: Campana[];
}

const STAGE_COLORS = [
  "bg-blue-600",
  "bg-indigo-600",
  "bg-violet-600",
  "bg-fuchsia-600",
  "bg-green-600",
];

export default function EmbudoPage() {
  const { toast } = useToast();
  const [days, setDays] = useState("30");
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/marketing/funnel?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "No se pudo calcular");
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
  }, [days, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const etapas = data?.etapas || [];
  const top = etapas[0]?.valor || 1;
  const alertas = (data?.alertas || []).filter((a) => a.valor > 0);

  const tasaLabels: { key: keyof FunnelData["tasas"]; from: string; to: string }[] = [
    { key: "vistasALeads", from: "vistas", to: "leads" },
    { key: "leadsAContactados", from: "leads", to: "contactados" },
    { key: "contactadosAInteresados", from: "contactados", to: "interesados" },
    { key: "interesadosAClientes", from: "interesados", to: "clientes" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Filter className="h-6 w-6" />
            Embudo
          </h1>
          <p className="text-sm text-muted-foreground">
            Dónde se te cae la gente, en los últimos {days} días.
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="90">Últimos 90 días</SelectItem>
            <SelectItem value="365">Último año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Calculando...
        </p>
      ) : (
        <>
          {/* Advertencia honesta: el primer salto NO es un recorrido real. */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="flex gap-3 p-4">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm">
                <strong>Cómo leer esto.</strong> Las visitas y los leads son
                dos conteos separados: el sistema no sabe que la persona que
                vio el producto es la misma que después escribió. El primer
                salto (visitas → leads) te dice la{" "}
                <em>proporción</em>, no cuántas personas avanzaron. Del lead en
                adelante sí es el mismo grupo de personas, así que esos saltos
                sí son reales. Las etapas se solapan a propósito: un cliente
                también fue contactado.
              </p>
            </CardContent>
          </Card>

          {/* El embudo */}
          <Card>
            <CardHeader>
              <CardTitle>Recorrido</CardTitle>
              <CardDescription>
                Cada barra es más angosta porque menos gente llega.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {etapas.map((etapa, i) => {
                const pct = top > 0 ? Math.max(2, (etapa.valor / top) * 100) : 0;
                const tasa = i > 0 ? data?.tasas[tasaLabels[i - 1].key] : null;

                return (
                  <React.Fragment key={etapa.key}>
                    {i > 0 && (
                      <div className="flex items-center gap-2 py-1 pl-2">
                        <TrendingDown className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {tasa === null || tasa === undefined ? (
                            "sin datos para calcular"
                          ) : (
                            <>
                              pasa el{" "}
                              <strong
                                className={
                                  tasa < 10 ? "text-destructive" : "text-foreground"
                                }
                              >
                                {tasa}%
                              </strong>{" "}
                              de {tasaLabels[i - 1].from} a{" "}
                              {tasaLabels[i - 1].to}
                            </>
                          )}
                        </span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{etapa.label}</span>
                        <span className="font-bold tabular-nums">
                          {etapa.valor.toLocaleString("es-AR")}
                        </span>
                      </div>
                      <div className="h-8 bg-muted rounded overflow-hidden">
                        <div
                          className={`h-full ${STAGE_COLORS[i] || "bg-slate-600"} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {etapa.ayuda}
                      </p>
                    </div>
                  </React.Fragment>
                );
              })}
            </CardContent>
          </Card>

          {alertas.length > 0 && (
            <Card className="border-amber-300 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Lo primero que hay que arreglar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {alertas.map((a) => (
                  <div key={a.key} className="flex items-start gap-3">
                    <div className="text-2xl font-bold text-amber-700 tabular-nums shrink-0">
                      {a.valor}
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{a.titulo}</p>
                      <p className="text-muted-foreground">{a.texto}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Qué campaña trajo clientes</CardTitle>
              <CardDescription>
                Cada fila es una campaña de tu embudo: incluye las creadas
                automáticamente desde Planificación.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!data?.porCampana?.length ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  En este período no hay campañas con visitas ni leads.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.porCampana.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 p-3 rounded border"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {c.name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {c.channel}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs shrink-0">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          {c.vistas}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {c.leads}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-green-700">
                          <UserCheck className="h-3 w-3" />
                          {c.clientes}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Link href="/marketing">
              <Button variant="outline">Ver campañas</Button>
            </Link>
            <Link href="/planificacion">
              <Button variant="outline">Ver planificación</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}