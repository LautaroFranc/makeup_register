// Link directo de WhatsApp con el mensaje ya escrito.
//
// wa.me exige el número en formato internacional, sin "+" ni espacios. El
// problema es que en Argentina el mismo celular se guarda de varias formas
// ("11 1234-5678", "+54 9 11 1234-5678", "5491112345678"), y si te equivocás
// el link abre WhatsApp pero no a tu negocio.
//
// Por eso normalizamos y devolvemos los dígitos usados: la UI los muestra
// para que el usuario pueda verificar a dónde va realmente el mensaje.

export function normalizeArgPhone(raw?: string | null): string {
  if (!raw) return "";

  // wa.me o chat.whatsapp.com ya viene como link: se extrae el número.
  const fromLink = raw.match(/wa\.me\/(\d+)/i);
  if (fromLink) return fromLink[1];

  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  // Ya viene completo.
  if (digits.startsWith("549")) return digits;
  if (digits.startsWith("54")) return digits;

  // Prefijo nacional: "011 1234-5678" -> "1112345678".
  if (digits.startsWith("0")) digits = digits.slice(1);

  // Celular con el 9 de móvil ya puesto y sin país: 11 dígitos.
  // 9 11 1234-5678 -> 549 11 1234-5678
  if (digits.startsWith("9") && digits.length === 11) {
    return `549${digits.slice(1)}`;
  }

  // Resto: formato local sin el 9 (10 dígitos). Se lo agregamos nosotros,
  // porque wa.me espera 54 + 9 + área + número. Sin esto el link abre
  // WhatsApp pero NO llega a un celular: es el caso por defecto guardado.
  return `549${digits}`;
}

export function buildWhatsappLink(
  phone: string | null | undefined,
  message?: string | null
): string {
  const digits = normalizeArgPhone(phone);
  if (!digits) return "";

  const base = `https://wa.me/${digits}`;
  const text = (message || "").trim();
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

// "549 11 1234-5678", para que el usuario vea a qué número va dirigido.
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  const digits = normalizeArgPhone(phone);
  if (!digits) return "";

  if (digits.length === 13 && digits.startsWith("549")) {
    return `+549 ${digits.slice(3, 5)} ${digits.slice(5, 9)}-${digits.slice(9)}`;
  }
  return `+${digits}`;
}