import { generateProtectedResourceMetadata } from "mcp-handler";
import {
  CORS_HEADERS,
  MCP_SCOPE,
  originFrom,
  resourceFrom,
} from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RFC 9728. Lo sirve este handler (y no `protectedResourceHandler`) porque
 * necesitamos que `resource` sea el endpoint MCP y no la URL del metadata.
 *
 * Ruta: /.well-known/oauth-protected-resource
 * También responde /.well-known/oauth-protected-resource/api/mcp por si el
 * cliente prueba la variante con path.
 */
export function GET(req: Request) {
  const origin = originFrom(req);

  const metadata = generateProtectedResourceMetadata({
    authServerUrls: [origin],
    resourceUrl: resourceFrom(req),
    additionalMetadata: {
      scopes_supported: [MCP_SCOPE],
      bearer_methods_supported: ["header"],
      resource_documentation: `${origin}/mcp`,
    },
  });

  return new Response(JSON.stringify(metadata), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "max-age=3600",
    },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
