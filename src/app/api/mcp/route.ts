import { createMcpHandler, withMcpAuth } from "mcp-handler";
import connectDB from "@/config/db";
import { verifyMcpToken } from "@/lib/mcp/auth";
import { registerTools } from "@/lib/mcp/tools";
import { CORS_HEADERS, MCP_SCOPE } from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const maxDuration = 60;

const mcpHandler = createMcpHandler(
  async (server) => {
    await connectDB();
    registerTools(server);
  },
  {
    serverInfo: {
      name: "makeup-register",
      version: "1.0.0",
    },
    instructions: [
      "Servidor MCP de Makeup Register, un inventario y punto de venta de productos de maquillaje.",
      "Todas las herramientas son de solo lectura y operan únicamente sobre la cuenta autenticada.",
      "No existen herramientas para modificar productos, ventas, stock ni configuración.",
      "Los precios de compra y mayoristas no están expuestos. Los datos personales de clientes tampoco.",
      "Usá effectivePrice como precio final de venta: ya incluye el descuento individual o global vigente.",
    ].join(" "),
  }
);

const authHandler = withMcpAuth(mcpHandler, verifyMcpToken, {
  required: true,
  requiredScopes: [MCP_SCOPE],
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

async function handler(req: Request) {
  const response = await authHandler(req);
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  headers.set(
    "Access-Control-Expose-Headers",
    "WWW-Authenticate, Mcp-Session-Id, MCP-Protocol-Version"
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export { handler as GET, handler as POST, handler as DELETE };

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
