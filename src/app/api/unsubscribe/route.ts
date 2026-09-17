import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Lead from "@/models/Lead";

connectDB();

// GET: /api/unsubscribe?email=cliente@ejemplo.com
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return new NextResponse(
        `
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 40px; color: #333;">
            <h2 style="color: #ef4444;">Error de Desuscripción</h2>
            <p>No se especificó la dirección de correo electrónico.</p>
          </body>
        </html>
        `,
        { headers: { "Content-Type": "text/html" }, status: 400 }
      );
    }

    // Actualizar estado del lead a "inactivo"
    await Lead.updateMany({ email: email.toLowerCase().trim() }, { status: "inactivo" });

    return new NextResponse(
      `
      <html>
        <head>
          <title>Desuscripción Confirmada</title>
          <meta charset="utf-8" />
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f9fafb; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px;">
          <div style="max-width: 480px; background: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e5e7eb; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="font-size: 48px; margin-bottom: 16px;">✉️</div>
            <h2 style="color: #111827; margin: 0 0 12px 0;">Te has desuscrito correctamente</h2>
            <p style="color: #6b7280; font-size: 15px; line-height: 1.5; margin-bottom: 24px;">
              Has sido removido/a de nuestra lista de correo para el email <strong>${email}</strong>. No recibirás más novedades ni promociones.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Si fue un error, puedes volver a registrarte en la tienda en cualquier momento.
            </p>
          </div>
        </body>
      </html>
      `,
      { headers: { "Content-Type": "text/html" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error al desuscribir cliente:", error);
    return new NextResponse(
      `
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 40px; color: #333;">
          <h2 style="color: #ef4444;">Error de Desuscripción</h2>
          <p>Ocurrió un error al procesar tu solicitud. Intenta nuevamente más tarde.</p>
        </body>
      </html>
      `,
      { headers: { "Content-Type": "text/html" }, status: 500 }
    );
  }
}
