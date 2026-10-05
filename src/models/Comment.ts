import mongoose, { Schema, Document, Model } from "mongoose";

export interface IComment extends Document {
  productId: string;
  authorName: string;
  authorEmail?: string;
  rating: number; // 1 a 5 estrellas
  comment: string;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema: Schema<IComment> = new Schema(
  {
    productId: {
      type: String,
      required: true,
      index: true,
    },
    authorName: {
      type: String,
      required: [true, "El nombre del autor es obligatorio"],
      trim: true,
    },
    authorEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    rating: {
      type: Number,
      required: true,
      min: [1, "La calificación mínima es 1"],
      max: [5, "La calificación máxima es 5"],
      default: 5,
    },
    comment: {
      type: String,
      required: [true, "El comentario es obligatorio"],
      trim: true,
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Comment: Model<IComment> =
  mongoose.models.Comment || mongoose.model<IComment>("Comment", CommentSchema);

export default Comment;
