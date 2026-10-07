import mongoose, { Schema, Document } from "mongoose";

export interface IFutureProduct extends Document {
  user: string;
  store: string;

  // Info básica
  name: string;
  description?: string;
  category?: string;

  // Proveedor y URL
  supplier: string;          // nombre del proveedor
  productUrl?: string;       // URL al producto (tienda o mayorista)

  // Costos de adquisición
  productCost: number;       // Precio de compra al proveedor
  shippingCost: number;      // Costo de envío
  otherCosts: number;        // Otros costos (aduana, embalaje, etc.)
  totalCost: number;         // Calculado: productCost + shippingCost + otherCosts

  // Costos de métricas/test
  testingCost: number;       // Costo de testeo (muestras, publicidad test, etc.)
  testingNotes?: string;     // Notas sobre el testeo

  // Precios sugeridos para cuando se lance
  suggestedSellPrice?: number;
  suggestedWholesalePrice?: number;
  estimatedMargin?: number;  // Margen estimado en %

  // Estado del pipeline
  status: "idea" | "planificado" | "pedido" | "en_testeo" | "aprobado" | "descartado";

  // Campos de seguimiento
  notes?: string;
  priority: "alta" | "media" | "baja";
  plannedDate?: Date;        // Fecha estimada de compra

  // Una vez convertido a producto
  convertedProductId?: string;
  convertedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const FutureProductSchema = new Schema<IFutureProduct>(
  {
    user: { type: String, required: true },
    store: { type: String, required: true },

    name: { type: String, required: true },
    description: { type: String },
    category: { type: String },

    supplier: { type: String, required: true, default: "" },
    productUrl: { type: String },

    productCost: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    otherCosts: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },

    testingCost: { type: Number, default: 0 },
    testingNotes: { type: String },

    suggestedSellPrice: { type: Number },
    suggestedWholesalePrice: { type: Number },
    estimatedMargin: { type: Number },

    status: {
      type: String,
      enum: ["idea", "planificado", "pedido", "en_testeo", "aprobado", "descartado"],
      default: "idea",
    },

    notes: { type: String },
    priority: {
      type: String,
      enum: ["alta", "media", "baja"],
      default: "media",
    },
    plannedDate: { type: Date },

    convertedProductId: { type: String },
    convertedAt: { type: Date },
  },
  { timestamps: true }
);

const FutureProduct =
  mongoose.models.FutureProduct ||
  mongoose.model<IFutureProduct>("FutureProduct", FutureProductSchema);

export default FutureProduct;
