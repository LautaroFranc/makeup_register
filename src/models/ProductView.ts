import mongoose, { Schema, Document } from "mongoose";

export interface IProductView extends Document {
  product: mongoose.Types.ObjectId;
  store: mongoose.Types.ObjectId;
  campaign?: mongoose.Types.ObjectId;
  viewerIp: string;
  userAgent?: string;
  createdAt: Date;
}

const ProductViewSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    store: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    campaign: { type: Schema.Types.ObjectId, ref: "Campaign" },
    viewerIp: { type: String, required: true },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ProductViewSchema.index({ store: 1, campaign: 1, createdAt: -1 });

export default mongoose.models.ProductView ||
  mongoose.model<IProductView>("ProductView", ProductViewSchema);
