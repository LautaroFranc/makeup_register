import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Store from "@/models/Store";

/**
 * GET /api/stores/public/config/[slug]
 * Obtiene la configuración pública de una tienda por slug
 * No requiere autenticación
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();

    const { slug } = await params;

    // Buscar tienda activa y pública
    const store = await Store.findOne({
      slug,
      isActive: true,
      isPublic: true,
    }).select(
      "name storeName description slug customUrl theme contact settings paymentMethods metrics createdAt updatedAt"
    );

    if (!store) {
      return NextResponse.json(
        { error: "Tienda no encontrada o no disponible" },
        { status: 404 }
      );
    }

    // Preparar datos públicos (sin información sensible)
    const publicConfig = {
      _id: store._id,
      name: store.name,
      storeName: store.storeName || store.name,
      description: store.description,
      slug: store.slug,
      customUrl: store.customUrl,

      theme: {
        primaryColor: store.theme.primaryColor,
        secondaryColor: store.theme.secondaryColor,
        accentColor: store.theme.accentColor,
        backgroundColor: store.theme.backgroundColor,
        textColor: store.theme.textColor,
        cardBackground: store.theme.cardBackground,
        borderColor: store.theme.borderColor,
        logoUrl: store.theme.logoUrl,
        faviconUrl: store.theme.faviconUrl,
        bannerUrls: store.theme.bannerUrls,
        fontFamily: store.theme.fontFamily,
        customCss: store.theme.customCss,
      },

      contact: store.contact,

      settings: {
        showPrices: store.settings.showPrices,
        showStock: store.settings.showStock,
        enableSearch: store.settings.enableSearch,
        enableFilters: store.settings.enableFilters,
      },

      // Métodos de pago sin datos sensibles
      paymentMethods: {
        directSale: {
          enabled: store.paymentMethods?.directSale?.enabled || false,
          whatsapp: store.paymentMethods?.directSale?.whatsapp,
          instagram: store.paymentMethods?.directSale?.instagram,
          facebook: store.paymentMethods?.directSale?.facebook,
          telegram: store.paymentMethods?.directSale?.telegram,
        },
        mercadoPago: {
          enabled: store.paymentMethods?.mercadoPago?.enabled || false,
          publicKey: store.paymentMethods?.mercadoPago?.publicKey, // Solo publicKey, NO accessToken
        },
        bankTransfer: {
          enabled: store.paymentMethods?.bankTransfer?.enabled || false,
          bankName: store.paymentMethods?.bankTransfer?.bankName,
          accountHolder: store.paymentMethods?.bankTransfer?.accountHolder,
          accountType: store.paymentMethods?.bankTransfer?.accountType,
          cbu: store.paymentMethods?.bankTransfer?.cbu,
          alias: store.paymentMethods?.bankTransfer?.alias,
          // NO enviar accountNumber completo por seguridad
        },
      },

      metrics: {
        publishedProducts: store.metrics.publishedProducts,
        totalCategories: store.metrics.totalCategories,
      },
    };

    return NextResponse.json(publicConfig);
  } catch (error) {
    console.error("Error al obtener configuración de tienda:", error);
    return NextResponse.json(
      { error: "Error al obtener configuración de la tienda" },
      { status: 500 }
    );
  }
}
