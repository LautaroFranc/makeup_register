"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bot,
  AlertTriangle,
  Eye,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";

/**
 * Página de consentimiento OAuth del servidor MCP.
 *
 * Vive fuera del layout protegido (ver src/app/layout.tsx): un cliente OAuth
 * externo (Claude, ChatGPT) abre esta URL, el usuario confirma y recién ahí se
 * emite el authorization code. No muestra ni pide datos de otras cuentas.
 */

const SCOPE_HINTS: Record<string, string> = {
  "mcp:read":
    "Leer tu perfil, tiendas, productos, categorías, ventas, campañas y planificación de contenido.",
};

export default function OAuthAuthorizePage() {
  return (
    <Suspense fallback={<PageShell>Cargando…</PageShell>}>
      <AuthorizeConsent />
    </Suspense>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-white p-8 shadow-lg">
        {children}
      </div>
    </div>
  );
}

function AuthorizeConsent() {
  const searchParams = useSearchParams();

  const params = useMemo(() => {
    return {
      client_id: searchParams.get("client_id") || "",
      redirect_uri: searchParams.get("redirect_uri") || "",
      response_type: searchParams.get("response_type") || "",
      code_challenge: searchParams.get("code_challenge") || "",
      code_challenge_method: searchParams.get("code_challenge_method") || "",
      state: searchParams.get("state") || "",
      scope: searchParams.get("scope") || "",
      resource: searchParams.get("resource") || "",
    };
  }, [searchParams]);

  const [loadingClient, setLoadingClient] = useState(true);
  const [clientName, setClientName] = useState("");
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [appToken, setAppToken] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState("");
  const [useOtherAccount, setUseOtherAccount] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const scopes = params.scope
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

  // Validación básica del request OAuth antes de mostrar el botón.
  const requestError = useMemo(() => {
    if (!params.client_id) return "Falta client_id en la URL.";
    if (!params.redirect_uri) return "Falta redirect_uri en la URL.";
    if (params.response_type !== "code") {
      return "response_type debe ser code.";
    }
    if (
      params.code_challenge_method !== "S256" ||
      params.code_challenge.length < 43
    ) {
      return "El cliente no envió un desafío PKCE válido (S256).";
    }
    return "";
  }, [params]);

  useEffect(() => {
    if (requestError) {
      setLoadingClient(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const query = new URLSearchParams({
          client_id: params.client_id,
          redirect_uri: params.redirect_uri,
        });
        const res = await fetch(`/api/oauth/authorize?${query.toString()}`);
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok || !data.valid) {
          setPageError(
            data.error_description ||
              "El cliente OAuth no es válido o su redirect_uri no está registrado."
          );
          return;
        }

        setClientName(data.client_name || "Aplicación MCP");
      } catch {
        if (!cancelled) {
          setPageError("No se pudo validar el cliente OAuth.");
        }
      } finally {
        if (!cancelled) setLoadingClient(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [params.client_id, params.redirect_uri, requestError]);

  // Si el usuario ya estaba logueado en el panel, ofrecemos esa sesión.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let cancelled = false;

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.success) return;
        setAppToken(token);
        setSessionEmail(data.email || data.name || "");
      })
      .catch(() => {
        /* sin sesión: se usa el formulario de credenciales */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const goBackWithError = () => {
    if (!params.redirect_uri) return;

    try {
      const target = new URL(params.redirect_uri);
      target.searchParams.set("error", "access_denied");
      target.searchParams.set(
        "error_description",
        "El usuario rechazó la conexión."
      );
      if (params.state) target.searchParams.set("state", params.state);
      target.searchParams.set("iss", window.location.origin);
      window.location.assign(target.toString());
    } catch {
      setFormError("redirect_uri inválida.");
    }
  };

  const handleAuthorize = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const body: Record<string, string> = {
        client_id: params.client_id,
        redirect_uri: params.redirect_uri,
        response_type: params.response_type,
        code_challenge: params.code_challenge,
        code_challenge_method: params.code_challenge_method,
      };

      if (params.state) body.state = params.state;
      if (params.scope) body.scope = params.scope;
      if (params.resource) body.resource = params.resource;

      if (appToken && !useOtherAccount) {
        body.appToken = appToken;
      } else {
        body.email = email.trim();
        body.password = password;
      }

      const res = await fetch("/api/oauth/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.redirect) {
        setFormError(
          data.error_description ||
            "No se pudo autorizar el conector. Revisá tus credenciales."
        );
        return;
      }

      window.location.assign(data.redirect);
    } catch {
      setFormError("Error de conexión. Intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const fatalError = requestError || pageError;

  if (loadingClient) {
    return (
      <PageShell>
        <div className="flex items-center justify-center gap-3 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Verificando el conector…</span>
        </div>
      </PageShell>
    );
  }

  if (fatalError) {
    return (
      <PageShell>
        <div className="space-y-4 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="text-xl font-bold text-gray-800">
            No se puede continuar
          </h1>
          <p className="text-sm text-gray-600">{fatalError}</p>
          <p className="text-xs text-gray-400">
            Cerrá esta pestaña y volvé a iniciar la conexión desde Claude o
            ChatGPT.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Bot className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">
            Conectar {clientName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {clientName} quiere acceder a los datos de tu panel.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Permisos solicitados
          </p>
          <ul className="space-y-2">
            {(scopes.length ? scopes : ["mcp:read"]).map((scope) => (
              <li key={scope} className="flex items-start gap-2 text-sm text-gray-700">
                <Eye className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <span>{SCOPE_HINTS[scope] || `Permiso ${scope}.`}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="flex items-center gap-2 font-medium">
            <ShieldCheck className="h-4 w-4" />
            Acceso de solo lectura
          </p>
          <p className="text-emerald-800">
            El conector no puede crear, modificar ni borrar nada. No ve precios
            de compra ni datos personales de tus clientes.
          </p>
        </div>

        {sessionEmail && !useOtherAccount ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
              <Lock className="h-4 w-4 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">Vas a autorizar como</p>
                <p className="truncate text-sm font-medium text-gray-800">
                  {sessionEmail}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUseOtherAccount(true)}
              className="text-xs font-medium text-blue-600 underline-offset-2 hover:underline"
            >
              Usar otra cuenta
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {sessionEmail && (
              <button
                type="button"
                onClick={() => setUseOtherAccount(false)}
                className="text-xs font-medium text-blue-600 underline-offset-2 hover:underline"
              >
                Volver a mi sesión actual
              </button>
            )}
          </div>
        )}

        {formError && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {formError}
          </p>
        )}

        <form onSubmit={handleAuthorize} className="space-y-3">
          <button
            type="submit"
            disabled={submitting || (!sessionEmail && (!email || !password))}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Autorizando…" : "Autorizar conexión"}
          </button>
          <button
            type="button"
            onClick={goBackWithError}
            disabled={submitting}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
          >
            Cancelar
          </button>
        </form>

        <p className="text-center text-xs text-gray-400">
          Podés revocar este acceso cuando quieras desde Configuración →
          Conectar IA en el panel.
        </p>
      </div>
    </PageShell>
  );
}
