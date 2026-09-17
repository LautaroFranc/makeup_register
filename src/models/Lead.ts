import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILead extends Document {
  name: string;
  email?: string;
  phone?: string;
  status: "nuevo" | "contactado" | "interesado" | "cliente" | "inactivo";
  notes?: string;
  source?: string;
  store?: mongoose.Types.ObjectId | string;
  slug?: string;
  user: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema: Schema<ILead> = new Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre del cliente/lead es requerido"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["nuevo", "contactado", "interesado", "cliente", "inactivo"],
      default: "nuevo",
    },
    notes: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
      default: "Manual",
    },
    slug: {
      type: String,
      trim: true,
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: "Store",
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Lead: Model<ILead> =
  mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);

export default Lead;
