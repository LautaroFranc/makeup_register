import mongoose, { Schema, Document, Model } from "mongoose";

// Redes que se planifican hoy. Se agrega una acá y el generador de ideas
// ya la soporta: no hay que tocar la UI.
export type ContentNetwork = "facebook" | "whatsapp";

export type ContentFormat =
  | "post"
  | "reel"
  | "video"
  | "story"
  | "catalogo"
  | "mensaje";

export type ContentStatus =
  | "idea"
  | "listo"
  | "programado"
  | "publicado"
  | "descartado";

export interface IContentPiece extends Document {
  _id: string;
  title: string;
  copy: string;
  notes?: string;
  network: ContentNetwork;
  format: ContentFormat;
  status: ContentStatus;
  // null = idea suelta, todavía sin día asignado.
  scheduledFor: Date | null;
  publishedAt: Date | null;
  product?: mongoose.Types.ObjectId | string;
  promotion?: mongoose.Types.ObjectId | string;
  // Métricas de la plataforma, cargadas a mano: no hay API de Instagram ni
  // de Facebook conectada, y no las vamos a conectar.
  results: {
    reach: number;
    interactions: number;
  };
  user: mongoose.Types.ObjectId | string;
  store: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const ContentPieceSchema: Schema<IContentPiece> = new Schema(
  {
    title: {
      type: String,
      required: [true, "El título es requerido"],
      trim: true,
    },
    copy: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
    },
    network: {
      type: String,
      enum: ["facebook", "whatsapp"],
      required: true,
      default: "facebook",
    },
    format: {
      type: String,
      enum: ["post", "reel", "video", "story", "catalogo", "mensaje"],
      required: true,
      default: "post",
    },
    status: {
      type: String,
      enum: ["idea", "listo", "programado", "publicado", "descartado"],
      required: true,
      default: "idea",
    },
    scheduledFor: {
      type: Date,
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
    },
    promotion: {
      type: Schema.Types.ObjectId,
      ref: "Promotion",
    },
    results: {
      reach: { type: Number, default: 0, min: 0 },
      interactions: { type: Number, default: 0, min: 0 },
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

ContentPieceSchema.index({ user: 1, store: 1, scheduledFor: 1 });
ContentPieceSchema.index({ user: 1, store: 1, status: 1 });

const ContentPiece: Model<IContentPiece> =
  mongoose.models.ContentPiece ||
  mongoose.model<IContentPiece>("ContentPiece", ContentPieceSchema);

export default ContentPiece;