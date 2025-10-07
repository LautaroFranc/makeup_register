import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICategory extends Document {
  name: string;
  description?: string;
  color?: string; // Color para identificar la categoría visualmente
  icon?: string; // Icono para la categoría
  user: string; // Referencia al usuario propietario
  isActive: boolean; // Si la categoría está activa
  productCount: number; // Contador de productos en esta categoría
}

const CategorySchema: Schema<ICategory> = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      default: "#3B82F6", // Color azul por defecto
    },
    icon: {
      type: String,
      default: "📦", // Icono por defecto
    },
    user: {
      type: String,
      required: true,
      ref: "Users",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    productCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Índices para optimizar consultas
CategorySchema.index({ user: 1, isActive: 1 });
CategorySchema.index({ user: 1, name: 1 }, { unique: true }); // Nombre único por usuario

const Category: Model<ICategory> =
  mongoose.models.Category ||
  mongoose.model<ICategory>("Category", CategorySchema);

export default Category;
