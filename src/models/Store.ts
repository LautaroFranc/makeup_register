import mongoose, { Schema, Document, Model } from "mongoose";
import slugify from "slugify";

export interface IStore extends Document {
  name: string;
  description?: string;
  slug: string; // URL única para la tienda
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
}

const StoreSchema: Schema<IStore> = new Schema(
  {
    name: {
      type: String,
      required: true,
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
