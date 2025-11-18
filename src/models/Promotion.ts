import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPromotion extends Document {
  name: string;
  type: "2x1" | "discount" | "bundle" | "special_price";
  product: mongoose.Types.ObjectId;
  productName?: string; // Cache del nombre del producto
  productBuyPrice?: number; // Cache del precio de compra
  productSellPrice?: number; // Cache del precio de venta normal
  giftProduct?: mongoose.Types.ObjectId; // Producto regalo (para 2x1 de productos diferentes)
  giftProductName?: string; // Cache del nombre del producto regalo
  giftProductBuyPrice?: number; // Cache del precio de compra del regalo
  giftProductSellPrice?: number; // Cache del precio de venta del regalo
  specialPrice: number; // Precio especial de la promoción
  margin: number; // Margen de ganancia (%) de la promoción
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  user: mongoose.Types.ObjectId;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PromotionSchema: Schema<IPromotion> = new Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre de la promoción es requerido"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["2x1", "discount", "bundle", "special_price"],
      required: [true, "El tipo de promoción es requerido"],
      default: "2x1",
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "El producto es requerido"],
    },
    productName: {
      type: String,
    },
    productBuyPrice: {
      type: Number,
    },
    productSellPrice: {
      type: Number,
    },
    giftProduct: {
      type: Schema.Types.ObjectId,
      ref: "Product",
    },
    giftProductName: {
      type: String,
    },
    giftProductBuyPrice: {
      type: Number,
    },
    giftProductSellPrice: {
      type: Number,
    },
    specialPrice: {
      type: Number,
      required: [true, "El precio especial es requerido"],
      min: [0, "El precio debe ser mayor o igual a 0"],
    },
    margin: {
      type: Number,
      required: [true, "El margen es requerido"],
    },
    startDate: {
      type: Date,
      required: [true, "La fecha de inicio es requerida"],
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El usuario es requerido"],
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Índices para mejorar el rendimiento
PromotionSchema.index({ user: 1, isActive: 1 });
PromotionSchema.index({ product: 1 });
PromotionSchema.index({ startDate: 1, endDate: 1 });

const Promotion: Model<IPromotion> =
  mongoose.models.Promotion ||
  mongoose.model<IPromotion>("Promotion", PromotionSchema);

export default Promotion;
