import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGlobalDiscount extends Document {
  user: mongoose.Types.ObjectId;
  store: mongoose.Types.ObjectId;
  isActive: boolean;
  discountPercentage: number;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  excludedCategories?: string[]; // IDs de categorías excluidas
  excludedProducts?: string[]; // IDs de productos excluidos
  createdAt?: Date;
  updatedAt?: Date;
}

const GlobalDiscountSchema: Schema<IGlobalDiscount> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El usuario es requerido"],
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: [true, "La tienda es requerida"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    discountPercentage: {
      type: Number,
      required: [true, "El porcentaje de descuento es requerido"],
      min: [0, "El descuento no puede ser negativo"],
      max: [100, "El descuento no puede ser mayor a 100%"],
    },
    name: {
      type: String,
      required: [true, "El nombre del descuento es requerido"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, "La fecha de inicio es requerida"],
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    excludedCategories: {
      type: [String],
      default: [],
    },
    excludedProducts: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Índices para mejorar el rendimiento
GlobalDiscountSchema.index({ user: 1, store: 1, isActive: 1 });
GlobalDiscountSchema.index({ startDate: 1, endDate: 1 });

const GlobalDiscount: Model<IGlobalDiscount> =
  mongoose.models.GlobalDiscount ||
  mongoose.model<IGlobalDiscount>("GlobalDiscount", GlobalDiscountSchema);

export default GlobalDiscount;
