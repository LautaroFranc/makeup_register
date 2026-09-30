import mongoose, { Schema, Document } from "mongoose";

export interface IProductView extends Document {
  product: mongoose.Types.ObjectId;
  store: mongoose.Types.ObjectId;
  viewerIp: string;
  userAgent?: string;
  createdAt: Date;
}

const ProductViewSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    store: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    viewerIp: { type: String, required: true },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.models.ProductView ||
  mongoose.model<IProductView>("ProductView", ProductViewSchema);
