// Generador de ideas de contenido.
//
// Es determinístico y rule-based: lee los productos y promociones reales de
// la tienda y arma publicaciones concretas. No usa IA ni ninguna API
// externa, así que funciona siempre y no cuesta nada.
//
// La idea central: el bloqueo real del marketing orgánico no es publicar,
// es no saber QUÉ publicar. Por eso cada idea trae un `rationale` que
// explica por qué la estás publicando ahora, y no solo un texto.

// --- Tipos de entrada (estructurales: no atan el generador a Mongoose) ---

export interface IdeaProduct {
  _id: string;
  name: string;
  description?: string;
  stock?: number;
  sellPrice?: string;
  discountedPrice?: string;
  hasDiscount?: boolean;
  discountPercentage?: number;
  category?: string;
  published?: boolean;
  views?: number;
  createdAt?: Date;
}

export interface IdeaPromotion {
  _id: string;
  name: string;
  type: "2x1" | "discount" | "bundle" | "special_price";
  productName?: string;
  specialPrice?: number;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
}

export interface IdeaGlobalDiscount {
  name: string;
  discountPercentage: number;
  description?: string;
  endDate?: Date;
  isActive?: boolean;
}

export interface IdeaContext {
  products: IdeaProduct[];
  promotions: IdeaPromotion[];
  globalDiscount?: IdeaGlobalDiscount | null;
  whatsappUrl?: string;
  storeUrl?: string;
}

export type IdeaNetwork = "facebook" | "whatsapp";

export interface GeneratedIdea {
  // Clave estable para poder deduplicar y para que la UI la use de id.
  key: string;
  title: string;
  network: IdeaNetwork;
  format: "post" | "reel" | "video" | "story" | "catalogo" | "mensaje";
  copy: string;
  rationale: string;
  product?: string;
  promotion?: string;
  suggestedDayOffset: number;
}

// --- Helpers de formato ---

function money(value: unknown): string {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(n)) return "";
  return `$${n.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

// El precio que realmente ve el cliente: si hay descuento activo, el
// descontado. No usamos sellPrice a secas porque miente.
export function currentPrice(p: IdeaProduct): string {
  if (p.hasDiscount && p.discountedPrice && parseFloat(p.discountedPrice) > 0) {
    return money(p.discountedPrice);
  }
  return money(p.sellPrice);
}

function discountBadge(p: IdeaProduct): string {
  if (!p.hasDiscount || !p.discountPercentage) return "";
  return ` (${Math.round(p.discountPercentage)}% off)`;
}

function daysUntil(date?: Date | null): number | null {
  if (!date) return null;
  const diff = date.getTime() - Date.now();
  return Math.round(diff / 86400000);
}

// --- Tips: rotan por fecha, así nunca se repiten siempre los mismos ---

const TIPS: { text: string; title: string }[] = [
  {
    title: "Tip de aplicación",
    text: "Aplicá en capas finas en lugar de una sola capa pesada. El resultado es más parejo y dura más.",
  },
  {
    title: "Tip de duración",
    text: "Un producto bien sellado con un poco de polvo al final rinde mucho más. La clave no es cuánto ponés, sino cómo terminás.",
  },
  {
    title: "Consejo de tono",
    text: "Elegí un tono una semana antes del evento, no el mismo día. Si te queda natural en la mano, en la cara se ve todavía mejor.",
  },
  {
    title: "Error común",
    text: "Mezclar dos tonos de rubor en la mano es mejor que en la mejilla. Aprendé la mezcla una vez y después es directo.",
  },
  {
    title: "Duración",
    text: "Base en capa fina y un poco de polvo en la zona de brillo (T) y la nariz. Ese es el combo que aguanta una jornada entera.",
  },
  {
    title: "Delator de look",
    text: "Las pestañas se ven mejor con dos capas finas que con una gruesa. El error más común es pasarte de producto.",
  },
  {
    title: "Preparación",
    text: "La prep es media hora antes, no cinco minutos. Es la diferencia entre un makeup que dura y uno que se corre al mediodía.",
  },
  {
    title: "Compra a ciegas",
    text: "Si tenés tres tonos y no sabés cuál, comprá el tono medio primero. El claro y el oscuro siempre se eligen después.",
  },
];

// --- Generadores por tipo de idea ---

function fbSpotlight(p: IdeaProduct, ctx: IdeaContext): GeneratedIdea {
  const precio = currentPrice(p);
  const desc = (p.description || "").trim();
  const wa = ctx.whatsappUrl ? `\n\n📩 Pedinos por acá: ${ctx.whatsappUrl}` : "\n\n📩 Escribime por WhatsApp para consultar stock.";

  return {
    key: `spotlight-${p._id}`,
    title: `Producto destacado: ${p.name}`,
    network: "facebook",
    format: "post",
    rationale: `Tu producto más visto (${p.views ?? 0} visitas). Si ya llamó la atención, conviene empujarlo con precio y CTA claro.`,
    product: p._id,
    suggestedDayOffset: 1,
    copy: [
      `✨ ${p.name}`,
      desc ? `\n${desc}` : "",
      `\n💰 ${precio}${discountBadge(p)}`,
      p.stock !== undefined && p.stock > 0 ? `\n📦 Stock disponible: ${p.stock} unidades` : "",
      `\nQuerés el tuyo? Escribime y te confirmo disponibilidad al instante.`,
    ]
      .filter(Boolean)
      .join("\n")
      .trim(),
  };
}

function waSpotlight(p: IdeaProduct, ctx: IdeaContext): GeneratedIdea {
  const precio = currentPrice(p);
  return {
    key: `spotlight-wa-${p._id}`,
    title: `Mensaje: ${p.name}`,
    network: "whatsapp",
    format: "mensaje",
    rationale: `Versión corta para mandar por lista o difusión. Sin foto, sin link: solo el mensaje que ya tenés copiado.`,
    product: p._id,
    suggestedDayOffset: 1,
    copy: [
      `Hola! 🌸 Te escribo porque tengo disponible:`,
      `\n${p.name} — ${precio}${discountBadge(p)}`,
      `\n¿Te interesa? Te lo reservo sin compromiso.`,
    ].join("\n"),
  };
}

function lowStock(p: IdeaProduct): GeneratedIdea[] {
  if (!p.stock || p.stock > 3) return [];
  const precio = currentPrice(p);
  return [
    {
      key: `lowstock-${p._id}`,
      title: `Últimas unidades: ${p.name}`,
      network: "facebook",
      format: "post",
      rationale: `Quedan ${p.stock} unidades. La escasez real es el argumento de venta más fuerte que tenés, y se está por agotar.`,
      product: p._id,
      suggestedDayOffset: 0,
      copy: [
        `⚠️ ÚLTIMAS UNIDADES`,
        `\n${p.name} — ${precio}${discountBadge(p)}`,
        `\nQuedan ${p.stock}. Cuando se van, no hay reposición inmediata.`,
        `\nEscribime antes de que se.agoten.`,
      ].join("\n"),
    },
    {
      key: `lowstock-wa-${p._id}`,
      title: `Mensaje últimas unidades: ${p.name}`,
      network: "whatsapp",
      format: "mensaje",
      rationale: "Mismo argumento de escasez, en formato mensaje directo. Funciona mejor en personas que ya te connaître.",
      product: p._id,
      suggestedDayOffset: 0,
      copy: [
        `Hola! 🌸 Aviso rápido:`,
        `quedan solo ${p.stock} unidades de ${p.name} (${precio}).`,
        `¿Te guardo una?`,
      ].join("\n"),
    },
  ];
}

function promotionIdea(pr: IdeaPromotion): GeneratedIdea[] {
  const dias = daysUntil(pr.startDate);
  const vigente = pr.isActive !== false && (dias === null || dias <= 0);

  const etiqueta =
    pr.type === "2x1"
      ? "2x1"
      : pr.type === "discount"
        ? `${pr.name}`
        : pr.name;

  const timing = !vigente
    ? `Empieza en ${dias} día${dias === 1 ? "" : "s"}. Publicá antes de que empiece para que la gente la vea coming.`
    : "Está activa ahora. Conviene publicarla hoy, no esperar al finde.";

  const body: string[] = [
    `🔥 ${etiqueta}${pr.productName ? ` en ${pr.productName}` : ""}`,
  ];

  if (pr.type === "2x1") {
    body.push(`Llevás dos y pagás uno. Es la promo que más se comparte.`);
  } else if (pr.specialPrice) {
    body.push(`Precio especial: ${money(pr.specialPrice)}`);
  }

  if (pr.endDate) {
    const d = daysUntil(pr.endDate);
    if (d !== null && d >= 0) {
      body.push(`⏰ Available hasta el ${pr.endDate.toLocaleDateString("es-AR")}.`);
    }
  }

  const ideas: GeneratedIdea[] = [
    {
      key: `promo-${pr._id}`,
      title: `Promoción: ${pr.name}`,
      network: "facebook",
      format: "post",
      rationale: `Viene de una Promotion real del sistema (${pr.type}). ${timing}`,
      promotion: pr._id,
      suggestedDayOffset: vigente ? 0 : Math.max(0, (dias ?? 1) - 2),
      copy: body.join("\n"),
    },
    {
      key: `promo-wa-${pr._id}`,
      title: `Mensaje promo: ${pr.name}`,
      network: "whatsapp",
      format: "mensaje",
      rationale: "La promo a lista de contactos. Es la que más rinde por mensaje en un negocio que factura por WhatsApp.",
      promotion: pr._id,
      suggestedDayOffset: vigente ? 0 : Math.max(0, (dias ?? 1) - 1),
      copy: [
        `Hola! 🌸 Tenés novedad:`,
        body[0],
        body[1] || "",
        `¿Querés que te reserve?`,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  return ideas;
}

function globalDiscountIdea(g: IdeaGlobalDiscount): GeneratedIdea[] {
  if (!g.isActive) return [];
  const pct = Math.round(g.discountPercentage);
  return [
    {
      key: "global-discount",
      title: `Descuento general: ${g.name}`,
      network: "facebook",
      format: "post",
      rationale: `Tenés un GlobalDiscount activo de ${pct}%. Es el argumento más fuerte del catálogo completo: publicalo y no lo desperdicies.`,
      suggestedDayOffset: 0,
      copy: [
        `🔥 ${pct}% OFF en todo el catálogo`,
        g.description || ` stocking discount aplicado a toda la tienda.`,
        ``,
        `🛒 Aprovechalo antes de que termine.`,
      ].join("\n"),
    },
    {
      key: "global-discount-wa",
      title: "Mensaje descuento general",
      network: "whatsapp",
      format: "mensaje",
      rationale: "Versión corta del descuento general para difusión.",
      suggestedDayOffset: 0,
      copy: `Hola! 🌸 ${pct}% de descuento en todo el catálogo por tiempo limitado. Si estabas esperando, es el momento.`,
    },
  ];
}

function tipIdea(weekIndex: number): GeneratedIdea {
  const tip = TIPS[weekIndex % TIPS.length];
  return {
    key: `tip-${weekIndex % TIPS.length}`,
    title: tip.title,
    network: "facebook",
    format: "post",
    rationale:
      "Contenido de utilidad puro: no vende hoy, pero es lo que hace que te sigan por valor y no solo por precio.",
    suggestedDayOffset: 2,
    copy: [
      `💡 ${tip.title}`,
      ``,
      tip.text,
      ``,
      `Guardá este post para cuando lo necesites 📌`,
    ].join("\n"),
  };
}

function testimonialIdea(): GeneratedIdea[] {
  return [
    {
      key: "testimonial",
      title: "Testimonio de clienta",
      network: "facebook",
      format: "post",
      rationale:
        "La prueba social es lo que más convierte en cosmetics. Este template te pide que lo completes vos: sin eso no se puede publicar solo.",
      suggestedDayOffset: 4,
      copy: [
        `💜 opinion de clienta`,
        ``,
        `[Acá va la frase que te mandaron, textual]`,
        ``,
        `— [Nombre], clienta`,
        ``,
        `¿Ya la compraste? Escribime y contame cómo te fue.`,
      ].join("\n"),
    },
    {
      key: "testimonial-wa",
      title: "Pedir review a clienta",
      network: "whatsapp",
      format: "mensaje",
      rationale:
        "No es un post: es el mensaje para pedirle el testimonio a quien ya te compró. Es la fuente de contenido más barata que tenés.",
      suggestedDayOffset: 4,
      copy: [
        `Hola! 🌸 ¿Qué te parecio [producto]?`,
        ``,
        `Si te gustó, me ayudaría mucho que me escribas dos líneas de opinión para mostrar en mi página. ¡Gracias!`,
      ].join("\n"),
    },
  ];
}

function catalogoIdea(ctx: IdeaContext): GeneratedIdea[] {
  const total = ctx.products.length;
  return [
    {
      key: "catalogo",
      title: "Post de catálogo completo",
      network: "facebook",
      format: "catalogo",
      rationale:
        "Un post recurrente que funciona cuando un cliente nuevo entra y no sabe qué tenés. Mostrale el catálogo entero una vez por semana.",
      suggestedDayOffset: 5,
      copy: [
        `✨ Esto es lo que tenés disponible`,
        ``,
        total > 0
          ? `${total} productos para elegir.`
          : `Cargá tus productos y armá este post.`,
        ``,
        `¿Buscás algo puntual? Decime qué necesitás y te digo qué hay.`,
      ].join("\n"),
    },
  ];
}

// --- Punto de entrada ---

export function generateIdeas(ctx: IdeaContext): GeneratedIdea[] {
  const ideas: GeneratedIdea[] = [];
  const weekIndex = Math.floor(Date.now() / (7 * 86400000));

  const published = ctx.products.filter((p) => p.published !== false);
  const withStock = published.filter((p) => (p.stock ?? 0) > 0);

  // 1. Lo que más llama la atención.
  const topByViews = [...withStock].sort(
    (a, b) => (b.views ?? 0) - (a.views ?? 0)
  )[0];
  if (topByViews) {
    ideas.push(fbSpotlight(topByViews, ctx), waSpotlight(topByViews, ctx));
  }

  // 2. Escasez real: el argumento más fuerte, y se agota solo.
  for (const p of withStock.filter((x) => (x.stock ?? 0) <= 3).slice(0, 2)) {
    ideas.push(...lowStock(p));
  }

  // 3. Promociones: primero las que ya arrancaron.
  const promos = [...ctx.promotions].sort((a, b) => {
    const da = daysUntil(a.startDate) ?? 999;
    const db = daysUntil(b.startDate) ?? 999;
    return da - db;
  });
  for (const pr of promos.slice(0, 2)) {
    ideas.push(...promotionIdea(pr));
  }

  // 4. Descuento general, si hay.
  if (ctx.globalDiscount) {
    ideas.push(...globalDiscountIdea(ctx.globalDiscount));
  }

  // 5. Utilidad + prueba social + catálogo: el relleno del calendario.
  ideas.push(tipIdea(weekIndex), ...testimonialIdea(), ...catalogoIdea(ctx));

  return ideas;
}