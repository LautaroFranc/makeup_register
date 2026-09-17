export function buildEmailTemplate({
  storeName,
  content,
  isHtml = false,
  recipientEmail,
}: {
  storeName?: string;
  content: string;
  isHtml?: boolean;
  recipientEmail?: string;
}) {
  const bodyContent = isHtml ? content : content.replace(/\n/g, "<br/>");
  const baseUrl = process.env.URL_PROD || "http://localhost:3000";
  const unsubscribeUrl = `${baseUrl}/api/unsubscribe${
    recipientEmail ? `?email=${encodeURIComponent(recipientEmail)}` : ""
  }`;

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      
      <!-- Contenido de la novedad o promoción personalizada -->
      <div style="padding: 12px 0 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
        ${bodyContent}
      </div>

      <!-- Pie de página con link de desuscripción -->
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px 0;" />
      <div style="text-align: center; color: #9ca3af; font-size: 12px; line-height: 1.5;">
        <p style="margin: 0 0 6px 0;">
          Has recibido este correo por estar registrado/a en ${storeName || "nuestra tienda"}.
        </p>
        <p style="margin: 0;">
          Si ya no deseas recibir nuestras novedades, puedes 
          <a href="${unsubscribeUrl}" target="_blank" style="color: #9333ea; text-decoration: underline; font-weight: 500;">
            Desuscribirte aquí
          </a>.
        </p>
      </div>
    </div>
  `;
}
