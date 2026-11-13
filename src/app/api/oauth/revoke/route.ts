import connectDB from "@/config/db";
import OAuthClient from "@/models/OAuthClient";
import OAuthToken from "@/models/OAuthToken";
import {
  CORS_HEADERS,
  jsonResponse,
  oauthError,
  parseBasicAuth,
  readRequestParams,
  safeEqual,
  sha256,
} from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RFC 7009. Revoca un access o refresh token. Responde 200 aunque el token no
 * exista, para no filtrar si era válido.
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

    if (params.token) {
      await OAuthToken.updateOne(
        {
          tokenHash: sha256(params.token),
          clientId: client.clientId,
        },
        { $set: { revokedAt: new Date() } }
      );
    }

    return jsonResponse({});
  } catch (error) {
    console.error("[oauth/revoke]", error);
    return oauthError("server_error", "No se pudo revocar el token.", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
