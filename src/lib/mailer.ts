import nodemailer from "nodemailer";

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
}: {
  to: string;
  name: string;
  storeName?: string;
}) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(
      "⚠️ EMAIL_USER o EMAIL_PASS no están configurados en las variables de entorno (.env). No se pudo enviar el correo de bienvenida."
    );
    return;
  }

  const subject = `¡Bienvenido/a${storeName ? ` a ${storeName}` : ""}! 🎉`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #d946ef; text-align: center;">¡Gracias por registrarte, ${name}!</h2>
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
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888; text-align: center;">
        Este es un correo automático de bienvenida.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"${storeName || "Makeup Register"}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    });
    console.log(`✉️ Correo de bienvenida enviado a: ${to}`);
  } catch (error) {
    console.error("❌ Error al enviar el correo de bienvenida:", error);
  }
}

export async function sendBroadcastEmail({
  recipients,
  subject,
  content,
  storeName,
}: {
  recipients: string[];
  subject: string;
  content: string;
  storeName?: string;
}) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      "EMAIL_USER o EMAIL_PASS no están configurados en las variables de entorno (.env)."
    );
  }

  if (!recipients || recipients.length === 0) {
    throw new Error("No hay destinatarios con correo electrónico válido.");
  }

  const formattedContent = content.replace(/\n/g, "<br/>");

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 16px; border-bottom: 2px solid #f3e8ff;">
        <h1 style="color: #9333ea; margin: 0; font-size: 22px;">${storeName || "Makeup Register"}</h1>
        <p style="color: #6b7280; font-size: 13px; margin-top: 4px;">Novedades y promociones exclusivas</p>
      </div>
      
      <div style="padding: 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
        ${formattedContent}
      </div>

      <div style="margin-top: 24px; padding: 16px; background-color: #faf5ff; border-radius: 8px; text-align: center;">
        <p style="margin: 0; color: #7e22ce; font-size: 14px; font-weight: 600;">
          ¡Gracias por confiar en nosotros! 💖
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px 0;" />
      <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0;">
        Has recibido este correo por ser cliente de ${storeName || "nuestra tienda"}.
      </p>
    </div>
  `;

  // Enviar a todos usando BCC para privacidad entre clientes
  const mailOptions = {
    from: `"${storeName || "Makeup Register"}" <${process.env.EMAIL_USER}>`,
    bcc: recipients,
    subject: subject,
    html: htmlContent,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}
