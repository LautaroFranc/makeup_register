import connectDB from "@/config/db";
import OAuthClient from "@/models/OAuthClient";
import {
  CORS_HEADERS,
  isValidRedirectUri,
  jsonResponse,
  oauthError,
  randomToken,
  sha256,
} from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED_GRANTS = ["authorization_code", "refresh_token"];
const SUPPORTED_RESPONSE_TYPES = ["code"];
const SUPPORTED_AUTH_METHODS = [
  "none",
  "client_secret_post",
  "client_secret_basic",
] as const;

type AuthMethod = (typeof SUPPORTED_AUTH_METHODS)[number];

function cleanText(value: unknown, max = 200): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return clean ? clean.slice(0, max) : undefined;
}

/**
 * Dynamic Client Registration (RFC 7591).
 *
 * Claude y ChatGPT se registran solos la primera vez que el usuario conecta
 * el conector. El `client_secret` (si el cliente lo pidió) se devuelve una
 * única vez; en Mongo solo queda el hash.
 */
export async function POST(req: Request) {
  try {
    await connectDB();

    let body: any;
    try {
      body = await req.json();
    } catch {
      return oauthError(
        "invalid_client_metadata",
        "El cuerpo debe ser JSON válido."
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return oauthError(
        "invalid_client_metadata",
        "El cuerpo debe ser un objeto JSON."
      );
    }

    const rawRedirectUris = body.redirect_uris;
    if (
      !Array.isArray(rawRedirectUris) ||
      rawRedirectUris.length === 0 ||
      rawRedirectUris.length > 10
    ) {
      return oauthError(
        "invalid_redirect_uri",
        "redirect_uris debe ser un array con entre 1 y 10 URLs."
      );
    }

    const redirectUris = Array.from(
      new Set(
        rawRedirectUris.filter(
          (uri: unknown): uri is string =>
            typeof uri === "string" && uri.length > 0
        )
      )
    );

    if (
      redirectUris.length !== rawRedirectUris.length ||
      redirectUris.some((uri) => !isValidRedirectUri(uri))
    ) {
      return oauthError(
        "invalid_redirect_uri",
        "Cada redirect_uri debe ser HTTPS (o HTTP en localhost) y no puede tener fragmento."
      );
    }

    const requestedGrants: string[] = Array.isArray(body.grant_types)
      ? body.grant_types.filter(
          (grant: unknown): grant is string => typeof grant === "string"
        )
      : ["authorization_code", "refresh_token"];

    if (
      requestedGrants.some((grant) => !SUPPORTED_GRANTS.includes(grant)) ||
      !requestedGrants.includes("authorization_code")
    ) {
      return oauthError(
        "invalid_client_metadata",
        "grant_types solo admite authorization_code y refresh_token."
      );
    }

    const requestedResponseTypes: string[] = Array.isArray(body.response_types)
      ? body.response_types.filter(
          (type: unknown): type is string => typeof type === "string"
        )
      : ["code"];

    if (
      requestedResponseTypes.some(
        (type) => !SUPPORTED_RESPONSE_TYPES.includes(type)
      ) ||
      !requestedResponseTypes.includes("code")
    ) {
      return oauthError(
        "invalid_client_metadata",
        "response_types solo admite code."
      );
    }

    const requestedMethod = body.token_endpoint_auth_method;
    const tokenEndpointAuthMethod: AuthMethod =
      requestedMethod === undefined
        ? "none"
        : SUPPORTED_AUTH_METHODS.includes(requestedMethod)
          ? requestedMethod
          : "none";

    if (
      requestedMethod !== undefined &&
      !SUPPORTED_AUTH_METHODS.includes(requestedMethod)
    ) {
      return oauthError(
        "invalid_client_metadata",
        "token_endpoint_auth_method no soportado."
      );
    }

    const clientId = `mcp_${randomToken(18)}`;
    const clientSecret =
      tokenEndpointAuthMethod === "none" ? undefined : randomToken(32);

    await OAuthClient.create({
      clientId,
      clientSecretHash: clientSecret ? sha256(clientSecret) : undefined,
      clientName: cleanText(body.client_name) || "Aplicación MCP",
      redirectUris,
      grantTypes: Array.from(new Set(requestedGrants)),
      responseTypes: Array.from(new Set(requestedResponseTypes)),
      tokenEndpointAuthMethod,
      softwareId: cleanText(body.software_id),
      softwareVersion: cleanText(body.software_version),
    });

    return jsonResponse(
      {
        client_id: clientId,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        ...(clientSecret
          ? { client_secret: clientSecret, client_secret_expires_at: 0 }
          : {}),
        client_name: cleanText(body.client_name) || "Aplicación MCP",
        redirect_uris: redirectUris,
        grant_types: Array.from(new Set(requestedGrants)),
        response_types: Array.from(new Set(requestedResponseTypes)),
        token_endpoint_auth_method: tokenEndpointAuthMethod,
      },
      201
    );
  } catch (error) {
    console.error("[oauth/register]", error);
    return oauthError(
      "server_error",
      "No se pudo registrar el cliente OAuth.",
      500
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
