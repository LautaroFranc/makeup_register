import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/config/db";
import OAuthClient from "@/models/OAuthClient";
import OAuthToken from "@/models/OAuthToken";
import { authMiddleware } from "../../middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Conexiones MCP activas del usuario logueado en el panel.
 *
 * Usa el JWT normal de la app (no un token OAuth) y filtra siempre por
 * `userId`. El usuario solo puede ver y revocar sus propias conexiones.
 */

export async function GET(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;

    const { _id } = (await authCheck.json()).user;
    await connectDB();

    const connections = await OAuthToken.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(_id),
          type: "access",
          revokedAt: null,
          expiresAt: { $gt: new Date() },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$clientId",
          scope: { $last: "$scope" },
          createdAt: { $max: "$createdAt" },
          lastUsedAt: { $max: "$lastUsedAt" },
        },
      },
    ]);

    const clientIds = connections.map((connection) => connection._id);
    const clients = clientIds.length
      ? await OAuthClient.find({ clientId: { $in: clientIds } }).select(
          "clientId clientName"
        )
      : [];

    const nameById = new Map(
      clients.map((client: any) => [client.clientId, client.clientName])
    );

    return NextResponse.json({
      success: true,
      connections: connections.map((connection: any) => ({
        clientId: connection._id,
        clientName:
          nameById.get(connection._id) || "Aplicación MCP conectada",
        scopes: String(connection.scope || "")
          .split(/\s+/)
          .filter(Boolean),
        createdAt: connection.createdAt,
        lastUsedAt: connection.lastUsedAt,
      })),
    });
  } catch (error: any) {
    console.error("Error listando conexiones MCP:", error);
    return NextResponse.json(
      { success: false, error: "No se pudieron listar las conexiones." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;

    const { _id } = (await authCheck.json()).user;
    const clientId = new URL(req.url).searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "Falta clientId." },
        { status: 400 }
      );
    }

    await connectDB();

    const result = await OAuthToken.updateMany(
      {
        userId: _id,
        clientId,
        revokedAt: null,
      },
      { $set: { revokedAt: new Date() } }
    );

    return NextResponse.json({
      success: true,
      revoked: result.modifiedCount,
    });
  } catch (error: any) {
    console.error("Error revocando conexión MCP:", error);
    return NextResponse.json(
      { success: false, error: "No se pudo revocar la conexión." },
      { status: 500 }
    );
  }
}
