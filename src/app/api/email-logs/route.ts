import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import EmailLog from "@/models/EmailLog";
import { verifyToken } from "../middleware";

export const dynamic = "force-dynamic";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const logs = await EmailLog.find({ user: decoded.userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error: any) {
    console.error("Error al obtener historial de correos:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener historial de envíos de correo.",
      },
      { status: 500 }
    );
  }
}
