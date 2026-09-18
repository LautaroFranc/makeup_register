import nodemailer from "nodemailer";
import { buildEmailTemplate } from "./emailTemplate";
import EmailLog from "@/models/EmailLog";
import connectDB from "@/config/db";

export { buildEmailTemplate };

export const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendWelcomeEmail({
  to,
  name,
  storeName,
  customSubject,
  customTemplate,
  userId,
  storeId,
}: {
  to: string;
  name: string;
  storeName?: string;
  customSubject?: string;
  customTemplate?: string;
  userId?: string;
  storeId?: string;
}) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(
      "⚠️ EMAIL_USER o EMAIL_PASS no están configurados en las variables de entorno (.env). No se pudo enviar el correo de bienvenida."
    );
    return;
  }

  const subject = customSubject || `¡Bienvenido/a${storeName ? ` a ${storeName}` : ""}! 🎉`;

  // Si el usuario configuró una plantilla personalizada, reemplazar la variable {name} o {nombre}
  let bodyContent = "";
  if (customTemplate && customTemplate.trim()) {
    bodyContent = customTemplate
      .replace(/{name}/gi, name)
      .replace(/{nombre}/gi, name)
      .replace(/{tienda}/gi, storeName || "nuestra tienda");
  } else {
    bodyContent = `
      <h2 style="color: #d946ef; text-align: center; margin-top: 0;">¡Gracias por registrarte, ${name}!</h2>
      <p style="font-size: 16px; color: #333; line-height: 1.5;">
        Nos alegra mucho tenerte con nosotros. Hemos recibido tus datos correctamente.
      </p>
      ${
        storeName
          ? `<p style="font-size: 15px; color: #555;">Estás en contacto directo con la tienda <strong>${storeName}</strong>.</p>`
          : ""
      }
      <div style="margin: 25px 0; padding: 15px; background-color: #fdf4ff; border-left: 4px solid #d946ef; border-radius: 4px;">
        <p style="margin: 0; color: #701a75; font-weight: bold;">
          Pronto nos pondremos en contacto contigo para brindarte más novedades e información sobre nuestros productos.
        </p>
      </div>
    `;
  }

  const htmlContent = buildEmailTemplate({
    storeName,
    content: bodyContent,
    isHtml: true,
    recipientEmail: to,
  });

  try {
    await transporter.sendMail({
      from: `"${storeName || "Makeup Register"}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    });
    console.log(`✉️ Correo de bienvenida enviado a: ${to}`);

    if (userId) {
      await connectDB();
      await EmailLog.create({
        user: userId,
        store: storeId,
        type: "welcome",
        subject,
        recipients: [to],
        recipientCount: 1,
        status: "sent",
      });
    }
  } catch (error: any) {
    console.error("❌ Error al enviar el correo de bienvenida:", error);
    if (userId) {
      try {
        await connectDB();
        await EmailLog.create({
          user: userId,
          store: storeId,
          type: "welcome",
          subject,
          recipients: [to],
          recipientCount: 1,
          status: "failed",
          errorMessage: error?.message || "Error al enviar correo",
        });
      } catch (logErr) {
        console.error("Error guardando EmailLog:", logErr);
      }
    }
  }
}

export async function sendBroadcastEmail({
  recipients,
  subject,
  content,
  isHtml = false,
  storeName,
  userId,
  storeId,
}: {
  recipients: string[];
  subject: string;
  content: string;
  isHtml?: boolean;
  storeName?: string;
  userId?: string;
  storeId?: string;
}) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      "EMAIL_USER o EMAIL_PASS no están configurados en las variables de entorno (.env)."
    );
  }

  if (!recipients || recipients.length === 0) {
    throw new Error("No hay destinatarios con correo electrónico válido.");
  }

  const htmlContent = buildEmailTemplate({ storeName, content, isHtml });

  // Enviar a todos usando BCC para privacidad entre clientes
  const mailOptions = {
    from: `"${storeName || "Makeup Register"}" <${process.env.EMAIL_USER}>`,
    bcc: recipients,
    subject: subject,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    if (userId) {
      await connectDB();
      await EmailLog.create({
        user: userId,
        store: storeId,
        type: "broadcast",
        subject,
        recipients,
        recipientCount: recipients.length,
        status: "sent",
      });
    }
    return info;
  } catch (error: any) {
    if (userId) {
      try {
        await connectDB();
        await EmailLog.create({
          user: userId,
          store: storeId,
          type: "broadcast",
          subject,
          recipients,
          recipientCount: recipients.length,
          status: "failed",
          errorMessage: error?.message || "Error al enviar novedades",
        });
      } catch (logErr) {
        console.error("Error guardando EmailLog:", logErr);
      }
    }
    throw error;
  }
}

