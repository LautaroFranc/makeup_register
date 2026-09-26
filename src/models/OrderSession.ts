import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrderSession extends Document {
  storeId: string;
  customerEmail?: string;
  customerPhone?: string;
  products: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  status: "CART_CREATED" | "PAYMENT_INITIATED" | "COMPLETED" | "ABANDONED";
  mercadoPagoPreferenceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSessionSchema = new Schema<IOrderSession>(
  {
    storeId: { type: String, required: true },
    customerEmail: { type: String },
    customerPhone: { type: String },
    products: [
      {
        productId: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["CART_CREATED", "PAYMENT_INITIATED", "COMPLETED", "ABANDONED"],
      default: "CART_CREATED",
    },
    mercadoPagoPreferenceId: { type: String },
  },
  { timestamps: true }
);

// Índices para las agregaciones del embudo de /api/analytics/dashboard
// (los carritos abandonados se derivan en lectura, no hay cron que los marque)
OrderSessionSchema.index({ status: 1, createdAt: 1 });

const OrderSession: Model<IOrderSession> =
  mongoose.models.OrderSession || mongoose.model<IOrderSession>("OrderSession", OrderSessionSchema);

export default OrderSession;
