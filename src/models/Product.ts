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
  user: string;
  category: string;
  published: boolean; // Control de visibilidad pública
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
    published: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true }
);

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
