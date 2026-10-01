"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, Users, UserCheck, Megaphone } from "lucide-react";

interface CampaignDetail {
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

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const campaignId = params.id as string;

  const [data, setData] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/marketing/campaigns", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "No se pudo cargar la campaña");
      }

      // El endpoint devuelve la lista; filtramos por id en vez de sumar
      // un endpoint extra que terminaría duplicando la lógica de scoping.
      const found = (json.campaigns || []).find(
        (c: CampaignDetail) => c._id === campaignId
      );

      if (!found) {
        throw new Error("Campaña no encontrada");
      }

      setData(found);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      router.push("/marketing");
    } finally {
      setLoading(false);
    }
  }, [campaignId, router, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Cargando campaña...</p>
      </div>
    );
  }

  if (!data) return null;

  // Diagnóstico: cada caso dice qué revisar primero, en orden.
  const diagnostics: string[] = [];
  if (data.vistas === 0) {
    diagnostics.push(
      "0 vistas: los enlaces no están llevando las UTM. Revisá que el enlace de la campaña incluya utm_source, utm_medium y utm_campaign."
    );
  }
  if (data.vistas > 0 && data.leads === 0) {
    diagnostics.push(
      "Hubo visitas pero ningún lead: el problema probablemente está en la página o en el formulario, no en el anuncio. Revisá que el formulario sea fácil de completar y que el CTA invite a dejarlo."
    );
  }
  if (data.leads > 0 && data.clientes === 0) {
    diagnostics.push(
      "Hay leads sin clientes: el seguimiento comercial no está cerrando. Revisá quién contacta, en cuántas horas y con qué mensaje."
    );
  }
  if (data.leads > 0 && data.vistas > 0 && (data.conversion || 0) < 2) {
    diagnostics.push(
      "La conversión vista → lead está por debajo del 2%: probá cambiar el mensaje del anuncio o el CTA antes de cambiar la audiencia."
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/marketing")}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Marketing
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            {data.name}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge>{data.status}</Badge>
            <span className="text-sm text-muted-foreground capitalize">
              {data.channel}
              {data.utmMedium ? ` · ${data.utmMedium}` : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              Vistas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.vistas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Leads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.leads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <UserCheck className="h-4 w-4" />
              Clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.clientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vista → Lead</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.conversion !== null ? `${data.conversion}%` : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {diagnostics.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base">Qué revisar</CardTitle>
            <CardDescription>
              Diagnóstico automático según los números de arriba.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              {diagnostics.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {data.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {data.notes}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enlace con UTM</CardTitle>
          <CardDescription>
            Usá este formato en tus publicaciones y anuncios para que la
            campaña se cree sola.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <code className="text-xs bg-muted p-3 rounded block break-all">
            {`?utm_source=${data.channel}&utm_medium=${data.utmMedium || "social"}&utm_campaign=${encodeURIComponent(data.name)}`}
          </code>
          <p className="text-xs text-muted-foreground mt-3">
            La atribución es de primer contacto: si el visitante ya había
            llegado antes con otra campaña, esta queda registrada como la
            original y no se sobreescribe.
          </p>
        </CardContent>
      </Card>

      <Link href="/marketing">
        <Button variant="outline">Ver todas las campañas</Button>
      </Link>
    </div>
  );
}
