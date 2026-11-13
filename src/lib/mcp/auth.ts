import jwt from "jsonwebtoken";
import type { AuthInfo } from "@modelcontextprotocol/server";
import connectDB from "@/config/db";
import Users from "@/models/Users";
import OAuthToken from "@/models/OAuthToken";
import { MCP_SCOPE, resourceFrom, sha256 } from "./oauth";

export interface AppTokenPayload extends jwt.JwtPayload {
  userId: string;
  email?: string;
  slug?: string;
  role?: string;
}

export interface McpProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

type ToolContext = {
  http?: {
    authInfo?: AuthInfo;
  };
};

/**
 * Verifica el bearer token que mandan Claude/ChatGPT en cada request MCP.
 *
 * El userId SIEMPRE sale de este lookup, nunca de un parámetro de la tool.
 * Esa es la garantía de que un usuario no puede pedir datos de otro: no hay
 * input del modelo que pueda cambiar el filtro `user`.
 */
export async function verifyMcpToken(
  req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  await connectDB();

  const token = await OAuthToken.findOne({
    tokenHash: sha256(bearerToken),
    type: "access",
  });

  if (!token) return undefined;
  if (token.revokedAt) return undefined;
  if (token.expiresAt.getTime() <= Date.now()) return undefined;

  // El token está atado a este deployment/dominio (RFC 8707).
  if (token.resource !== resourceFrom(req)) return undefined;

  const scopes = token.scope.split(/\s+/).filter(Boolean);
  if (!scopes.includes(MCP_SCOPE)) return undefined;

  const user = await Users.findById(token.userId).select(
    "_id name email slug role"
  );
  if (!user) return undefined;

  try {
    await OAuthToken.updateOne(
      { _id: token._id },
      { $set: { lastUsedAt: new Date() } }
    );
  } catch {
    // No bloqueamos la request por no poder actualizar la métrica de uso.
  }

  return {
    token: bearerToken,
    clientId: token.clientId,
    scopes,
    expiresAt: Math.floor(token.expiresAt.getTime() / 1000),
    resource: new URL(token.resource),
    extra: {
      userId: String(user._id),
      userName: user.name,
      userEmail: user.email,
      role: user.role,
    },
  };
}

/**
 * Resuelve el usuario desde el JWT normal de la app (el de localStorage).
 * Se usa únicamente en el POST de /api/oauth/authorize, cuando la persona ya
 * está logueada en el panel y autoriza al conector sin reescribir la clave.
 */
export async function userFromAppToken(appToken: string) {
  if (!appToken) return null;

  try {
    const decoded = jwt.verify(
      appToken,
      process.env.JWT_SECRET || ""
    ) as AppTokenPayload;

    if (!decoded?.userId) return null;

    await connectDB();
    return Users.findById(decoded.userId).select("_id name email slug role");
  } catch {
    return null;
  }
}

export function getMcpProfile(ctx: ToolContext): McpProfile {
  const extra = ctx.http?.authInfo?.extra;

  if (!extra || typeof extra.userId !== "string" || !extra.userId) {
    throw new Error("Sesión MCP no autenticada");
  }

  return {
    id: extra.userId,
    name: typeof extra.userName === "string" ? extra.userName : "",
    email: typeof extra.userEmail === "string" ? extra.userEmail : "",
    role: typeof extra.role === "string" ? extra.role : "",
  };
}

export function getMcpUserId(ctx: ToolContext): string {
  return getMcpProfile(ctx).id;
}
