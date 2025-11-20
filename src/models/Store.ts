import mongoose, { Schema, Document, Model } from "mongoose";
import slugify from "slugify";

export interface IStore extends Document {
  _id: string;
  name: string;
  storeName?: string; // Nombre público de la tienda (si es diferente de name)
  description?: string;
  slug: string; // URL única para la tienda
  customUrl?: string; // URL personalizada editable por el usuario
  user: string; // Referencia al usuario propietario
  isActive: boolean; // Si la tienda está activa
  isPublic: boolean; // Si la tienda es visible públicamente

  // Configuración de la tienda
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    cardBackground: string;
    borderColor: string;
    logoUrl?: string;
    faviconUrl?: string;
    bannerUrls?: string[]; // Múltiples banners para slider/carrusel
    fontFamily?: string; // Tipografía personalizada
    customCss?: string;
  };

  // Configuración de contacto
  contact: {
    email?: string;
    phone?: string;
    address?: string;
    socialMedia?: {
      instagram?: string;
      facebook?: string;
      twitter?: string;
    };
  };

  // Métricas de la tienda
  metrics: {
    totalProducts: number;
    publishedProducts: number;
    totalCategories: number;
    totalStock: number;
    totalValue: number;
    lastUpdated: Date;
  };

  // Configuración de la tienda
  settings: {
    allowPublicView: boolean;
    requireLogin: boolean;
    showPrices: boolean;
    showStock: boolean;
    enableSearch: boolean;
    enableFilters: boolean;
  };

  // Métodos de pago
  paymentMethods: {
    directSale: {
      enabled: boolean;
      whatsapp?: string;
      instagram?: string;
      facebook?: string;
      telegram?: string;
    };
    mercadoPago?: {
      enabled: boolean;
      publicKey?: string;
      accessToken?: string;
    };
    bankTransfer?: {
      enabled: boolean;
      bankName?: string;
      accountNumber?: string;
      accountHolder?: string;
      accountType?: string; // "ahorros" | "corriente"
      cbu?: string;
      alias?: string;
    };
  };
}

const StoreSchema: Schema<IStore> = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    storeName: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    customUrl: {
      type: String,
      trim: true,
    },
    user: {
      type: String,
      required: true,
      ref: "Users",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },

    // Configuración de tema
    theme: {
      primaryColor: {
        type: String,
        default: "#3B82F6",
      },
      secondaryColor: {
        type: String,
        default: "#10B981",
      },
      accentColor: {
        type: String,
        default: "#F59E0B",
      },
      backgroundColor: {
        type: String,
        default: "#FFFFFF",
      },
      textColor: {
        type: String,
        default: "#1F2937",
      },
      cardBackground: {
        type: String,
        default: "#F9FAFB",
      },
      borderColor: {
        type: String,
        default: "#E5E7EB",
      },
      logoUrl: {
        type: String,
      },
      faviconUrl: {
        type: String,
      },
      bannerUrls: {
        type: [String],
        default: [],
      },
      fontFamily: {
        type: String,
        default: "Inter, sans-serif",
      },
      customCss: {
        type: String,
      },
    },

    // Configuración de contacto
    contact: {
      email: {
        type: String,
      },
      phone: {
        type: String,
      },
      address: {
        type: String,
      },
      socialMedia: {
        instagram: {
          type: String,
        },
        facebook: {
          type: String,
        },
        twitter: {
          type: String,
        },
      },
    },

    // Métricas de la tienda
    metrics: {
      totalProducts: {
        type: Number,
        default: 0,
      },
      publishedProducts: {
        type: Number,
        default: 0,
      },
      totalCategories: {
        type: Number,
        default: 0,
      },
      totalStock: {
        type: Number,
        default: 0,
      },
      totalValue: {
        type: Number,
        default: 0,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },

    // Configuración de la tienda
    settings: {
      allowPublicView: {
        type: Boolean,
        default: true,
      },
      requireLogin: {
        type: Boolean,
        default: false,
      },
      showPrices: {
        type: Boolean,
        default: true,
      },
      showStock: {
        type: Boolean,
        default: true,
      },
      enableSearch: {
        type: Boolean,
        default: true,
      },
      enableFilters: {
        type: Boolean,
        default: true,
      },
    },

    // Métodos de pago
    paymentMethods: {
      directSale: {
        enabled: {
          type: Boolean,
          default: false,
        },
        whatsapp: {
          type: String,
        },
        instagram: {
          type: String,
        },
        facebook: {
          type: String,
        },
        telegram: {
          type: String,
        },
      },
      mercadoPago: {
        enabled: {
          type: Boolean,
          default: false,
        },
        publicKey: {
          type: String,
        },
        accessToken: {
          type: String,
        },
      },
      bankTransfer: {
        enabled: {
          type: Boolean,
          default: false,
        },
        bankName: {
          type: String,
        },
        accountNumber: {
          type: String,
        },
        accountHolder: {
          type: String,
        },
        accountType: {
          type: String,
        },
        cbu: {
          type: String,
        },
        alias: {
          type: String,
        },
      },
    },
  },
  { timestamps: true }
);

// Generar slug antes de guardar
StoreSchema.pre<IStore>("save", function (next) {
  if (!this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Índices para optimizar consultas
StoreSchema.index({ user: 1, isActive: 1 });
StoreSchema.index({ slug: 1 }, { unique: true });
StoreSchema.index({ user: 1, name: 1 }, { unique: true });

const Store: Model<IStore> =
  mongoose.models.Store || mongoose.model<IStore>("Store", StoreSchema);

export default Store;
