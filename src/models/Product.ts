import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProduct extends Document {
  name: string;
  category: string;
  description: string;
  image: string;
  buyPrice: string;
  sellPrice: string;
  stock: number;
}

const ProductSchema: Schema<IProduct> = new Schema(
  {
    category: {
      type: String,
      required: true,
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
  },
  { timestamps: true }
);

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
