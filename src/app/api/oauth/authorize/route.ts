import bcrypt from "bcrypt";
import connectDB from "@/config/db";
import Users from "@/models/Users";
import OAuthClient from "@/models/OAuthClient";
import OAuthCode from "@/models/OAuthCode";
import { userFromAppToken } from "@/lib/mcp/auth";
import {
  AUTH_CODE_TTL_SECONDS,
  CORS_HEADERS,
  canonicalResource,
  grantedScope,
  jsonResponse,
  oauthError,
  originFrom,
  randomToken,
  readRequestParams,
  sha256,
} from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PKCE_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/;

/**
 * GET /api/oauth/authorize?client_id=...&redirect_uri=...
 *
 * Validación previa que usa la página de consentimiento para mostrar el
 * nombre del cliente sin exponer datos de otros usuarios. No emite códigos.
 */
export async function GET(req: Request) {
  try {
    await connectDB();
    const url = new URL(req.url);
    const clientId = url.searchParams.get("client_id");
    const redirectUri = url.searchParams.get("redirect_uri");

    if (!clientId) {
      return oauthError("invalid_request", "Falta client_id.");
    }

    const client = await OAuthClient.findOne({ clientId });
    if (!client) {
      return oauthError("invalid_request", "client_id desconocido.");
    }

    if (!redirectUri || !client.redirectUris.includes(redirectUri)) {
      return oauthError(
        "invalid_request",
        "redirect_uri no está registrado para este cliente."
      );
    }

    return jsonResponse({
      valid: true,
      client_id: client.clientId,
      client_name: client.clientName,
      redirect_uri: redirectUri,
      scope: grantedScope(url.searchParams.get("scope")),
      read_only: true,
    });
  } catch (error) {
    console.error("[oauth/authorize:GET]", error);
    return oauthError(
      "server_error",
      "No se pudo validar el cliente OAuth.",
      500
    );
  }
}

/**
 * POST /api/oauth/authorize
 *
 * La página /oauth/authorize llama acá después de que la persona confirma.
 * Acepta dos formas de identificar al usuario:
 *  - appToken: el JWT de la app que ya está en localStorage (sesión abierta).
 *  - email + password: login explícito dentro del flujo OAuth.
 *
 * En ningún caso el userId lo elige el cliente OAuth: sale de la sesión o de
 * las credenciales verificadas. El código queda atado a ese usuario.
 */
export async function POST(req: Request) {
  try {
    await connectDB();
    const params = await readRequestParams(req);

    const clientId = params.client_id;
    const redirectUri = params.redirect_uri;

    if (!clientId) {
      return oauthError("invalid_request", "Falta client_id.");
    }

    const client = await OAuthClient.findOne({ clientId });
    if (!client) {
      return oauthError("invalid_request", "client_id desconocido.");
    }

    if (!redirectUri || !client.redirectUris.includes(redirectUri)) {
      return oauthError(
        "invalid_request",
        "redirect_uri no está registrado para este cliente."
      );
    }

    if (params.response_type !== "code") {
      return oauthError(
        "unsupported_grant_type",
        "response_type debe ser code."
      );
    }

    if (
      params.code_challenge_method !== "S256" ||
      !params.code_challenge ||
      !PKCE_PATTERN.test(params.code_challenge)
    ) {
      return oauthError(
        "invalid_request",
        "PKCE es obligatorio: code_challenge_method=S256 y un code_challenge válido."
      );
    }

    if (params.state && params.state.length > 2048) {
      return oauthError("invalid_request", "state es demasiado largo.");
    }

    const resource = canonicalResource(req, params.resource);
    if (!resource) {
      return oauthError(
        "invalid_target",
        "El parámetro resource no corresponde a este servidor MCP."
      );
    }

    const scope = grantedScope(params.scope);

    let user: any = null;

    if (params.appToken) {
      user = await userFromAppToken(params.appToken);
    }

    if (!user && params.email && params.password) {
      const found = await Users.findOne({ email: params.email.trim() });
      if (found && (await bcrypt.compare(params.password, found.password))) {
        user = found;
      }
    }

    if (!user) {
      return oauthError(
        "access_denied",
        "Credenciales inválidas o sesión expirada. Iniciá sesión para autorizar el conector.",
        401
      );
    }

    const code = randomToken(32);
    await OAuthCode.create({
      codeHash: sha256(code),
      clientId: client.clientId,
      userId: user._id,
      redirectUri,
      codeChallenge: params.code_challenge,
      codeChallengeMethod: "S256",
      scope,
      resource,
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000),
    });

    const target = new URL(redirectUri);
    target.searchParams.set("code", code);
    target.searchParams.set("scope", scope);
    target.searchParams.set("iss", originFrom(req));
    if (params.state) target.searchParams.set("state", params.state);

    return jsonResponse({ redirect: target.toString() });
  } catch (error) {
    console.error("[oauth/authorize]", error);
    return oauthError(
      "server_error",
      "No se pudo autorizar el conector.",
      500
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
