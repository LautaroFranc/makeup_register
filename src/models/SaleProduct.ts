import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProduct extends Document {
  idProduct: string;
  sellPrice: string;
  stock: number;
  user: mongoose.Types.ObjectId;
  isPublicSale: boolean; // Indica si la venta fue hecha desde el endpoint público
  createdAt?: Date;
  updatedAt?: Date;
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
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isPublicSale: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const SaleProduct: Model<IProduct> =
  mongoose.models.SaleProduct ||
  mongoose.model<IProduct>("SaleProduct", SaleProductSchema);

export default SaleProduct;
