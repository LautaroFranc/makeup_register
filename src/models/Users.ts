import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUsers extends Document {
  name: string;
  password: string;
  email: string;
  role: string;
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
    role: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Users: Model<IUsers> =
  mongoose.models.Users || mongoose.model<IUsers>("Users", UsersSchema);

export default Users;
