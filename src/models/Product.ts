import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProduct extends Document {
  name: string;
  description: string;
  image: string;
  images: string[]; // Múltiples imágenes
  attributes: {
    [key: string]: string[]; // Atributos dinámicos: { "color": ["rojo", "azul"], "tamaño": ["S", "M", "L"] }
  };
  buyPrice: string;
  sellPrice: string;
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
  },
  { timestamps: true }
);

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
