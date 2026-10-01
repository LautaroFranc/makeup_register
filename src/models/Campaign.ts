import mongoose, { Schema, Document, Model } from "mongoose";

export type CampaignStatus = "activa" | "pausada" | "terminada";

export interface ICampaign extends Document {
  _id: string;
  name: string;
  channel: string;
  utmMedium?: string;
  status: CampaignStatus;
  notes?: string;
  user: mongoose.Types.ObjectId | string;
  store: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema: Schema<ICampaign> = new Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre de la campaña es requerido"],
      trim: true,
    },
    channel: {
      type: String,
      required: [true, "El canal es requerido"],
      trim: true,
      lowercase: true,
      default: "otro",
    },
    utmMedium: {
      type: String,
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ["activa", "pausada", "terminada"],
      default: "activa",
    },
    notes: {
      type: String,
      trim: true,
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

CampaignSchema.index({ user: 1, store: 1 });
CampaignSchema.index({ user: 1, name: 1 });

const Campaign: Model<ICampaign> =
  mongoose.models.Campaign || mongoose.model<ICampaign>("Campaign", CampaignSchema);

export default Campaign;
