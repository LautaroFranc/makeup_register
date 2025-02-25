import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProduct extends Document {
  idProduct: string;
  sellPrice: string;
  stock: number;
}

const SaleProductSchema: Schema<IProduct> = new Schema(
  {
    idProduct: {
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

const SaleProduct: Model<IProduct> =
  mongoose.models.SaleProduct ||
  mongoose.model<IProduct>("SaleProduct", SaleProductSchema);

export default SaleProduct;
