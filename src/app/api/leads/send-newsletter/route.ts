import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Lead from "@/models/Lead";
import Users from "@/models/Users";
import Store from "@/models/Store";
import { verifyToken } from "../../middleware";
import { sendBroadcastEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

connectDB();

export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    const body = await req.json();
    const { subject, content, isHtml, targetType, selectedLeadIds } = body;

    if (!subject || !subject.trim()) {
      return NextResponse.json(
        { success: false, error: "El asunto de la novedad es obligatorio" },
        { status: 400 }
      );
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: "El contenido del mensaje es obligatorio" },
        { status: 400 }
      );
    }

    const userObj = await Users.findById(userId);
    const storeObj = await Store.findOne({ user: userId });
    const storeName = storeObj?.name || userObj?.name || "Nuestra Tienda";

    let query: any = { user: userId, email: { $exists: true, $ne: "" } };

    // Si seleccionó enviar solo a clientes específicos
    if (targetType === "selected" && Array.isArray(selectedLeadIds) && selectedLeadIds.length > 0) {
      query._id = { $in: selectedLeadIds };
    }

    const leads = await Lead.find(query).select("email name");

    const recipientEmails = leads
      .map((lead) => lead.email?.trim())
      .filter((email): email is string => Boolean(email && email.includes("@")));

    if (recipientEmails.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No se encontraron clientes con direcciones de correo válidas para enviar.",
        },
        { status: 400 }
      );
    }

    // Enviar correos
    await sendBroadcastEmail({
      recipients: recipientEmails,
      subject,
      content,
      isHtml: Boolean(isHtml),
      storeName,
      userId: userId,
      storeId: storeObj?._id?.toString(),
    });

    return NextResponse.json({
      success: true,
      message: `Novedad enviada exitosamente a ${recipientEmails.length} cliente(s).`,
      count: recipientEmails.length,
    });
  } catch (error: any) {
    console.error("Error al enviar novedades:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error inesperado al enviar las novedades por email.",
      },
      { status: 500 }
    );
  }
}
