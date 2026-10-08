import mongoose, { Schema, Document, Model } from "mongoose";
import slugify from "slugify";

export interface IProduct extends Document {
  name: string;
  description: string;
  brand: string; // Marca, tipeada a mano (ej: "Maybelline")
  brandSlug: string; // Marca normalizada, se usa para filtrar (evita tildes/mayúsculas)
  image: string;
  images: string[]; // Múltiples imágenes
  attributes: {
    [key: string]: string[]; // Atributos dinámicos: { "color": ["rojo", "azul"], "tamaño": ["S", "M", "L"] }
  };
  buyPrice: string;
  sellPrice: string;
  wholesalePrice: string; // Precio mayorista
  stock: number;
  code: string;
  barcode: string; // Código de barras EAN-13/EAN-8
  user: string; // Usuario propietario
  store: string; // Tienda a la que pertenece el producto
  category: string;
  published: boolean; // Control de visibilidad pública
  // Campos de descuento
  hasDiscount: boolean; // Si el producto tiene descuento activo
  discountPercentage: number; // Porcentaje de descuento (ej: 10 = 10%)
  discountedPrice: string; // Precio con descuento aplicado
  discountStartDate?: Date; // Fecha de inicio del descuento
  discountEndDate?: Date; // Fecha de fin del descuento
  views: number; // Contador de visitas públicas al producto (usado por /api/analytics)
}

const ProductSchema: Schema<IProduct> = new Schema(
  {
    code: {
      type: String,
      required: true,
    },
    barcode: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
    brand: {
      type: String,
      default: "",
      trim: true,
    },
    brandSlug: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    images: {
      type: [String],
      default: [],
    },
    attributes: {
      type: Schema.Types.Mixed,
      default: {},
    },
    buyPrice: {
      type: String,
      required: true,
    },
    sellPrice: {
      type: String,
      required: true,
    },
    wholesalePrice: {
      type: String,
      default: "0",
    },
    stock: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    user: {
      type: String,
      required: true,
    },
    store: {
      type: String,
      required: true,
      ref: "Store",
    },
    published: {
      type: Boolean,
      default: true,
      required: true,
    },
    hasDiscount: {
      type: Boolean,
      default: false,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: [0, "El descuento no puede ser negativo"],
      max: [100, "El descuento no puede ser mayor a 100%"],
    },
    discountedPrice: {
      type: String,
      default: "0",
    },
    discountStartDate: {
      type: Date,
    },
    discountEndDate: {
      type: Date,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Normaliza la marca para poder filtrar sin depender de tildes ni mayúsculas.
// A diferencia de Category.slug, se regenera en cada save: la marca no es
// identidad de URL, el usuario la edita libremente y el slug tiene que seguirla.
ProductSchema.pre<IProduct>("save", function (next) {
  this.brandSlug = this.brand
    ? slugify(this.brand, { lower: true, strict: true })
    : "";
  next();
});

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
