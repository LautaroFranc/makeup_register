import mongoose, { Schema, Document } from "mongoose";

export interface IEmailLog extends Document {
  user: mongoose.Types.ObjectId;
  store?: mongoose.Types.ObjectId;
  type: "welcome" | "broadcast" | "promotion" | "notification";
  subject: string;
  recipients: string[];
  recipientCount: number;
  status: "sent" | "failed";
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailLogSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    store: { type: Schema.Types.ObjectId, ref: "Store" },
    type: {
      type: String,
      enum: ["welcome", "broadcast", "promotion", "notification"],
      default: "broadcast",
      required: true,
    },
    subject: { type: String, required: true },
    recipients: [{ type: String }],
    recipientCount: { type: Number, default: 0 },
    status: { type: String, enum: ["sent", "failed"], default: "sent" },
    errorMessage: { type: String },
  },
  {
    timestamps: true,
  }
);

EmailLogSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.EmailLog ||
  mongoose.model<IEmailLog>("EmailLog", EmailLogSchema);
