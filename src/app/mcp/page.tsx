"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Bot,
  Check,
  Copy,
  Eye,
  ExternalLink,
  Loader2,
  Lock,
  PlugZap,
  ShieldCheck,
  Trash2,
  Zap,
} from "lucide-react";

interface Connection {
  clientId: string;
  clientName: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string | null;
}

/**
 * Página de conexión de asistentes (Claude / ChatGPT) al servidor MCP.
 *
 * El endpoint es público en el sentido de "alcanzable", pero cada request
 * exige un bearer token OAuth emitido por esta app. Acá solo se muestra cómo
 * conectarse y se permite revocar las conexiones propias.
 */
export default function McpPage() {
  const { toast } = useToast();

  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedChatGPT, setCopiedChatGPT] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);

  const endpoint = origin ? `${origin}/api/mcp` : "/api/mcp";

  // Deep link de Claude — abre claude.ai con el modal pre-llenado
  const claudeDeepLink = origin
    ? `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=${encodeURIComponent("Makeup Register")}&connectorUrl=${encodeURIComponent(`${origin}/api/mcp`)}`
    : "#";

  // Para ChatGPT no existe deep link oficial → copiamos la URL al portapapeles
  const copyChatGPTUrl = async () => {
    try {
      await navigator.clipboard.writeText(endpoint);
      setCopiedChatGPT(true);
      toast({
        title: "URL copiada para ChatGPT",
        description: "Pegala en ChatGPT → Configuración → Conectores → Agregar conector MCP personalizado.",
      });
      setTimeout(() => setCopiedChatGPT(false), 3000);
    } catch {
      toast({
        title: "No se pudo copiar",
        description: endpoint,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const loadConnections = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Iniciá sesión para ver tus conexiones.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/mcp/connections", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "No se pudieron cargar las conexiones.");
        return;
      }

      setConnections(data.connections || []);
    } catch {
      setError("Error de conexión al cargar las conexiones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const copyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(endpoint);
      setCopied(true);
      toast({
        title: "URL copiada",
        description: "Pegala en Claude o ChatGPT al agregar el conector.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "No se pudo copiar",
        description: endpoint,
        variant: "destructive",
      });
    }
  };

  const revoke = async (connection: Connection) => {
    const confirmed = window.confirm(
      `¿Revocar el acceso de "${connection.clientName}"? El asistente dejará de poder consultar tus datos.`
    );
    if (!confirmed) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setRevoking(connection.clientId);

      const res = await fetch(
        `/api/mcp/connections?clientId=${encodeURIComponent(
          connection.clientId
        )}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          title: "No se pudo revocar",
          description: data.error || "Intentá de nuevo.",
          variant: "destructive",
        });
        return;
      }

      setConnections((prev) =>
        prev.filter((item) => item.clientId !== connection.clientId)
      );
      toast({
        title: "Conexión revocada",
        description: `"${connection.clientName}" ya no tiene acceso.`,
      });
    } catch {
      toast({
        title: "Error de conexión",
        description: "No se pudo revocar la conexión.",
        variant: "destructive",
      });
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
          <Bot className="h-6 w-6 text-blue-600" />
          Conectar IA
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Conectá Claude o ChatGPT a tu panel mediante MCP. El asistente puede
          consultar tus datos, pero nunca modificarlos ni ver los de otra
          cuenta.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PlugZap className="h-4 w-4 text-blue-600" />
            Tu servidor MCP
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              URL del conector
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <code className="flex-1 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                {endpoint}
              </code>
              <Button
                type="button"
                variant="outline"
                onClick={copyEndpoint}
                className="gap-2"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copiada" : "Copiar"}
              </Button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Autenticación OAuth 2.1. No uses una API key ni un token personal.
            </p>
          </div>

          {/* ── Botones de conexión rápida ── */}
          <div className="pt-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Conexión rápida
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {/* Claude — deep link oficial que pre-llena el modal */}
              <a
                href={claudeDeepLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  origin
                    ? "bg-[#D97706] hover:bg-[#B45309] text-white"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none"
                }`}
              >
                <Bot className="h-4 w-4" />
                Conectar a Claude
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>

              {/* ChatGPT — copia URL + instrucciones (no existe deep link oficial) */}
              <button
                type="button"
                onClick={copyChatGPTUrl}
                disabled={!origin}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-800 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copiedChatGPT ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Zap className="h-4 w-4 text-green-600" />
                )}
                {copiedChatGPT ? "URL copiada ✓" : "Conectar a ChatGPT"}
              </button>
            </div>

            {/* Aviso para ChatGPT */}
            <div className="mt-2 rounded-lg border border-green-100 bg-green-50/60 px-3 py-2 text-xs text-green-700">
              <span className="font-medium">ChatGPT:</span> al hacer clic se copia la URL.
              Pegala en ChatGPT → <span className="font-medium">Configuración → Conectores → Agregar conector MCP personalizado</span>.
              Requiere plan Pro, Team o Enterprise.
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="flex items-center gap-2 font-medium">
              <ShieldCheck className="h-4 w-4" />
              Solo lectura y solo tus datos
            </p>
            <ul className="list-inside list-disc space-y-1 text-emerald-800">
              <li>No puede crear, editar ni borrar productos o ventas.</li>
              <li>No devuelve precios de compra ni precios mayoristas.</li>
              <li>No expone leads ni datos personales de tus clientes.</li>
              <li>Podés revocar el acceso en cualquier momento abajo.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Claude</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <ol className="list-inside list-decimal space-y-1">
              <li>Abrí Claude y andá a Configuración → Conectores.</li>
              <li>Elegí agregar un conector personalizado (MCP).</li>
              <li>Pegá la URL de arriba.</li>
              <li>
                Claude abre la página de autorización: iniciá sesión y
                confirmá el acceso.
              </li>
            </ol>
            <p className="text-xs text-gray-400">
              La disponibilidad de conectores personalizados depende de tu plan
              de Claude.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ChatGPT</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <ol className="list-inside list-decimal space-y-1">
              <li>
                Abrí ChatGPT y andá a Configuración → Conectores → Avanzado.
              </li>
              <li>Activá el modo desarrollador si te lo pide.</li>
              <li>Agregá un conector nuevo con la URL de arriba.</li>
              <li>
                Autorizá el acceso con tu cuenta del panel cuando se abra la
                página.
              </li>
            </ol>
            <p className="text-xs text-gray-400">
              Los conectores MCP personalizados requieren un plan compatible y
              pueden cambiar de nombre según la versión de ChatGPT.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-gray-500" />
            Conexiones activas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando conexiones…
            </div>
          ) : error ? (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          ) : connections.length === 0 ? (
            <div className="py-6 text-center">
              <Eye className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">
                Todavía no hay asistentes conectados.
              </p>
              <p className="text-xs text-gray-400">
                Cuando autorices uno, va a aparecer acá.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {connections.map((connection) => (
                <li
                  key={connection.clientId}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-gray-800">
                        {connection.clientName}
                      </span>
                      {connection.scopes.map((scope) => (
                        <Badge key={scope} variant="secondary">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Autorizada:{" "}
                      {formatDate(connection.createdAt)}
                      {connection.lastUsedAt
                        ? ` · Último uso: ${formatDate(connection.lastUsedAt)}`
                        : " · Sin uso todavía"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => revoke(connection)}
                    disabled={revoking === connection.clientId}
                  >
                    {revoking === connection.clientId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Revocar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
