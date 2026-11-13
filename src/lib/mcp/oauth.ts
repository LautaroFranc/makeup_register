import crypto from "crypto";
import { getPublicOrigin } from "mcp-handler";

/**
 * Constantes y helpers del servidor de autorización OAuth 2.1 que usa el MCP.
 *
 * Este módulo NO toca Mongo: solo firma, hashea, valida parámetros y arma
 * respuestas. Así se puede testear y reutilizar desde todas las rutas.
 */

export const MCP_PATH = "/api/mcp";
export const MCP_SCOPE = "mcp:read";
export const SUPPORTED_SCOPES = [MCP_SCOPE] as const;

export const AUTH_CODE_TTL_SECONDS = 5 * 60;
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

export type OAuthErrorCode =
  | "invalid_request"
  | "invalid_client"
  | "invalid_grant"
  | "invalid_client_metadata"
  | "invalid_redirect_uri"
  | "unauthorized_client"
  | "unsupported_grant_type"
  | "invalid_scope"
  | "access_denied"
  | "invalid_target"
  | "server_error";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, MCP-Protocol-Version, Mcp-Session-Id",
  "Access-Control-Max-Age": "86400",
};

export function originFrom(req: Request): string {
  return getPublicOrigin(req).replace(/\/+$/, "");
}

export function resourceFrom(req: Request): string {
  return `${originFrom(req)}${MCP_PATH}`;
}

/**
 * El RFC 8707 permite que el cliente mande `resource` en authorize y token.
 * Aceptamos tanto la URL del endpoint MCP como el origin pelado (algunos
 * clientes mandan el issuer). Cualquier otra cosa se rechaza: si no, un token
 * emitido para otro resource podría usarse acá.
 */
export function canonicalResource(req: Request, raw?: string | null): string | null {
  const expected = resourceFrom(req);
  if (!raw) return expected;

  try {
    const url = new URL(raw);
    if (url.search || url.hash) return null;
    if (url.username || url.password) return null;

    const path = url.pathname.replace(/\/+$/, "");
    const normalized = `${url.origin}${path}`;
    if (normalized === expected || normalized === url.origin) return expected;
    return null;
  } catch {
    return null;
  }
}

export function grantedScope(raw?: string | null): string {
  const requested = (raw || "")
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

  const supported = requested.filter((scope) =>
    (SUPPORTED_SCOPES as readonly string[]).includes(scope)
  );

  return (supported.length ? Array.from(new Set(supported)) : [MCP_SCOPE]).join(
    " "
  );
}

export function hasScope(scope: string, expected: string): boolean {
  return scope.split(/\s+/).filter(Boolean).includes(expected);
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function pkceS256(verifier: string): string {
  return crypto.createHash("sha256").update(verifier, "utf8").digest("base64url");
}

/** Comparación de tiempo constante para secretos y hashes. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function isValidRedirectUri(raw: string): boolean {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) {
    return false;
  }

  try {
    const url = new URL(raw);
    if (url.username || url.password || url.hash) return false;
    if (url.protocol === "https:") return true;
    if (
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname)
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function parseBasicAuth(
  header: string | null
): { clientId: string; clientSecret: string } | null {
  if (!header || !header.toLowerCase().startsWith("basic ")) return null;

  try {
    const decoded = Buffer.from(header.slice(6).trim(), "base64").toString(
      "utf8"
    );
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;

    return {
      clientId: decodeURIComponent(decoded.slice(0, separator)),
      clientSecret: decodeURIComponent(decoded.slice(separator + 1)),
    };
  } catch {
    return null;
  }
}

export async function readRequestParams(
  req: Request
): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return {};

    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string") params[key] = value;
      else if (typeof value === "number" || typeof value === "boolean") {
        params[key] = String(value);
      }
    }
    return params;
  }

  const text = await req.text();
  return Object.fromEntries(new URLSearchParams(text));
}

export function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
      ...extraHeaders,
    },
  });
}

export function oauthError(
  error: OAuthErrorCode,
  description: string,
  status = 400,
  extraHeaders: Record<string, string> = {}
): Response {
  return jsonResponse(
    { error, error_description: description },
    status,
    extraHeaders
  );
}

/** Escapa un string para usarlo dentro de un `$regex` de Mongo. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
