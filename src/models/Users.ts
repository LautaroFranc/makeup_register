import mongoose, { Schema, Document, Model } from "mongoose";
import slugify from "slugify";

export interface IUsers extends Document {
  name: string;
  password: string;
  email: string;
  slug: string; // 👈 Agregamos el slug
}

const UsersSchema: Schema<IUsers> = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    password: {
      required: true,
      type: String,
    },
    email: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true }
);

// 🛠 Generar slug antes de guardar
UsersSchema.pre<IUsers>("save", function (next) {
  if (!this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

const Users: Model<IUsers> =
  mongoose.models.Users || mongoose.model<IUsers>("Users", UsersSchema);

export default Users;
