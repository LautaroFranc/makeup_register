import mongoose, { Schema, Document, Model } from "mongoose";
import slugify from "slugify";

export interface ICategory extends Document {
  name: string;
  slug: string; // slug normalizado desde `name`, usado por el endpoint público
  description?: string;
  color?: string; // Color para identificar la categoría visualmente
  icon?: string; // Icono para la categoría
  user: string; // Referencia al usuario propietario
  store: string; // Referencia a la tienda
  isActive: boolean; // Si la categoría está activa
  productCount: number; // Contador de productos en esta categoría
  orden: number; // Orden de visualización de la categoría
}

const CategorySchema: Schema<ICategory> = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      default: "",
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
    store: {
      type: String,
      required: true,
      ref: "Store",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    productCount: {
      type: Number,
      default: 0,
    },
    orden: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Generar slug antes de guardar (misma convención que Users y Store).
// El guard `if (!this.slug)` hace que el slug sea inmutable una vez creado:
// renombrar la categoría no reescribe el slug, igual que el resto del sistema.
CategorySchema.pre<ICategory>("save", function (next) {
  if (!this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Índices para optimizar consultas
CategorySchema.index({ user: 1, isActive: 1 });
CategorySchema.index({ store: 1, isActive: 1 });
CategorySchema.index({ user: 1, slug: 1 }); // lookup del endpoint público
CategorySchema.index({ user: 1, store: 1, name: 1 }, { unique: true }); // Nombre único por usuario

const Category: Model<ICategory> =
  mongoose.models.Category ||
  mongoose.model<ICategory>("Category", CategorySchema);

export default Category;
