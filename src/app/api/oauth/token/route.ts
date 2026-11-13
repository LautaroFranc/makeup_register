import connectDB from "@/config/db";
import OAuthClient from "@/models/OAuthClient";
import OAuthCode from "@/models/OAuthCode";
import OAuthToken from "@/models/OAuthToken";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  CORS_HEADERS,
  REFRESH_TOKEN_TTL_SECONDS,
  canonicalResource,
  jsonResponse,
  oauthError,
  parseBasicAuth,
  pkceS256,
  randomToken,
  readRequestParams,
  resourceFrom,
  safeEqual,
  sha256,
} from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PKCE_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/;

interface TokenPair {
  response: Record<string, unknown>;
  refreshTokenHash?: string;
}

async function createTokenPair(
  userId: unknown,
  clientId: string,
  scope: string,
  resource: string,
  includeRefresh: boolean
): Promise<TokenPair> {
  const now = Date.now();
  const accessToken = randomToken(32);
  const refreshToken = includeRefresh ? randomToken(32) : null;

  const docs: Record<string, unknown>[] = [
    {
      tokenHash: sha256(accessToken),
      type: "access",
      clientId,
      userId,
      scope,
      resource,
      expiresAt: new Date(now + ACCESS_TOKEN_TTL_SECONDS * 1000),
    },
  ];

  if (refreshToken) {
    docs.push({
      tokenHash: sha256(refreshToken),
      type: "refresh",
      clientId,
      userId,
      scope,
      resource,
      expiresAt: new Date(now + REFRESH_TOKEN_TTL_SECONDS * 1000),
    });
  }

  await OAuthToken.create(docs);

  return {
    response: {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      ...(refreshToken
        ? {
            refresh_token: refreshToken,
            refresh_token_expires_in: REFRESH_TOKEN_TTL_SECONDS,
          }
        : {}),
      scope,
    },
    refreshTokenHash: refreshToken ? sha256(refreshToken) : undefined,
  };
}

/**
 * POST /api/oauth/token
 *
 * Intercambia el authorization code (con PKCE S256) o un refresh token por
 * un access token nuevo. Los tokens son opacos y en Mongo queda solo su hash.
 */
export async function POST(req: Request) {
  try {
    await connectDB();
    const params = await readRequestParams(req);

    const basic = parseBasicAuth(req.headers.get("authorization"));
    const clientId = basic?.clientId || params.client_id;
    const clientSecret = basic?.clientSecret || params.client_secret;

    if (!clientId) {
      return oauthError("invalid_client", "Falta client_id.", 401);
    }

    const client = await OAuthClient.findOne({ clientId });
    if (!client) {
      return oauthError("invalid_client", "Cliente OAuth desconocido.", 401);
    }

    if (client.tokenEndpointAuthMethod !== "none") {
      // El cliente pidió autenticación con secreto (DCR). La exigimos.
      if (
        !client.clientSecretHash ||
        !clientSecret ||
        !safeEqual(sha256(clientSecret), client.clientSecretHash)
      ) {
        return oauthError("invalid_client", "client_secret inválido.", 401, {
          "WWW-Authenticate": 'Basic realm="mcp"',
        });
      }
    }

    const grantType = params.grant_type;

    if (grantType === "authorization_code") {
      const code = params.code;
      const redirectUri = params.redirect_uri;
      const codeVerifier = params.code_verifier;

      if (!code || !redirectUri || !codeVerifier) {
        return oauthError(
          "invalid_request",
          "Faltan code, redirect_uri o code_verifier."
        );
      }

      if (!PKCE_PATTERN.test(codeVerifier)) {
        return oauthError("invalid_grant", "code_verifier inválido.");
      }

      const codeDoc = await OAuthCode.findOne({ codeHash: sha256(code) });
      if (
        !codeDoc ||
        codeDoc.usedAt ||
        codeDoc.expiresAt.getTime() <= Date.now()
      ) {
        return oauthError("invalid_grant", "Código inválido o vencido.");
      }

      if (codeDoc.clientId !== client.clientId) {
        return oauthError("invalid_grant", "El código pertenece a otro cliente.");
      }

      if (codeDoc.redirectUri !== redirectUri) {
        return oauthError("invalid_grant", "redirect_uri no coincide.");
      }

      if (!safeEqual(pkceS256(codeVerifier), codeDoc.codeChallenge)) {
        return oauthError("invalid_grant", "PKCE no coincide.");
      }

      if (params.resource) {
        const requestedResource = canonicalResource(req, params.resource);
        if (!requestedResource || requestedResource !== codeDoc.resource) {
          return oauthError(
            "invalid_target",
            "El resource no coincide con el código."
          );
        }
      }

      if (codeDoc.resource !== resourceFrom(req)) {
        return oauthError(
          "invalid_target",
          "El código fue emitido para otro servidor."
        );
      }

      // Consumo atómico: dos requests concurrentes no pueden usar el mismo code.
      const consumed = await OAuthCode.findOneAndUpdate(
        { _id: codeDoc._id, usedAt: null },
        { $set: { usedAt: new Date() } },
        { new: false }
      );

      if (!consumed) {
        return oauthError("invalid_grant", "El código ya fue usado.");
      }

      const pair = await createTokenPair(
        codeDoc.userId,
        client.clientId,
        codeDoc.scope,
        codeDoc.resource,
        client.grantTypes.includes("refresh_token")
      );

      return jsonResponse(pair.response);
    }

    if (grantType === "refresh_token") {
      const refreshToken = params.refresh_token;
      if (!refreshToken) {
        return oauthError("invalid_request", "Falta refresh_token.");
      }

      const token = await OAuthToken.findOne({
        tokenHash: sha256(refreshToken),
        type: "refresh",
      });

      if (!token) {
        return oauthError("invalid_grant", "Refresh token inválido.");
      }
      if (token.revokedAt) {
        return oauthError("invalid_grant", "Refresh token revocado.");
      }
      if (token.expiresAt.getTime() <= Date.now()) {
        return oauthError("invalid_grant", "Refresh token vencido.");
      }
      if (token.clientId !== client.clientId) {
        return oauthError(
          "invalid_grant",
          "El refresh token pertenece a otro cliente."
        );
      }

      if (params.resource) {
        const requestedResource = canonicalResource(req, params.resource);
        if (!requestedResource || requestedResource !== token.resource) {
          return oauthError(
            "invalid_target",
            "El resource no coincide con el token."
          );
        }
      }

      if (token.resource !== resourceFrom(req)) {
        return oauthError(
          "invalid_target",
          "El token fue emitido para otro servidor."
        );
      }

      let scope = token.scope;
      if (params.scope) {
        const originalScopes = token.scope.split(/\s+/).filter(Boolean);
        const requestedScopes = params.scope.split(/\s+/).filter(Boolean);

        if (requestedScopes.some((item) => !originalScopes.includes(item))) {
          return oauthError(
            "invalid_scope",
            "El refresh token no tiene esos permisos."
          );
        }
        scope = Array.from(new Set(requestedScopes)).join(" ");
      }

      const consumed = await OAuthToken.findOneAndUpdate(
        { _id: token._id, revokedAt: null },
        { $set: { revokedAt: new Date() } },
        { new: false }
      );

      if (!consumed) {
        return oauthError("invalid_grant", "El refresh token ya fue usado.");
      }

      const pair = await createTokenPair(
        token.userId,
        client.clientId,
        scope,
        token.resource,
        client.grantTypes.includes("refresh_token")
      );

      if (pair.refreshTokenHash) {
        await OAuthToken.updateOne(
          { _id: token._id },
          { $set: { replacedByTokenHash: pair.refreshTokenHash } }
        );
      }

      return jsonResponse(pair.response);
    }

    return oauthError(
      "unsupported_grant_type",
      "grant_type debe ser authorization_code o refresh_token."
    );
  } catch (error) {
    console.error("[oauth/token]", error);
    return oauthError(
      "server_error",
      "No se pudo emitir el token.",
      500
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
