// Helpers de UTM compartidos entre Planificación y Marketing.
//
// El detalle importante: `track/ingest` normaliza las UTM a minúsculas
// (normalizeUtm) y recién después busca la Campaign por nombre. Si el
// nombre que guardamos y el que la persona pega en el link no coinciden
// carácter por carácter, la atribución se rompe en silencio: se crea una
// campaña nueva y el lead queda sin origen. Por eso el slug se genera una
// sola vez, acá, y es ese string el que la UI muestra para copiar.

export function slugifyUtm(value: string): string {
  return (value || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function buildUtmQuery({
  source,
  medium,
  campaign,
}: {
  source: string;
  medium?: string;
  campaign: string;
}): string {
  const params = new URLSearchParams();
  params.set("utm_source", source);
  params.set("utm_medium", medium || "organic");
  params.set("utm_campaign", campaign);
  return params.toString();
}
