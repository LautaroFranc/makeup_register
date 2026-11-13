import mongoose, { Schema, Document, Model } from "mongoose";

export type OAuthTokenType = "access" | "refresh";

/**
 * Token OAuth emitido por la app. Nunca guardamos el valor en claro: el
 * cliente recibe un string aleatorio y en Mongo queda su SHA-256. Así, un
 * dump de la base no permite usar los tokens.
 */
export interface IOAuthToken extends Document {
  tokenHash: string;
  type: OAuthTokenType;
  clientId: string;
  userId: mongoose.Types.ObjectId;
  scope: string;
  resource: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedByTokenHash?: string;
  lastUsedAt?: Date | null;
  createdAt: Date;
}

const OAuthTokenSchema: Schema<IOAuthToken> = new Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["access", "refresh"],
      required: true,
    },
    clientId: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    scope: {
      type: String,
      required: true,
    },
    resource: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    replacedByTokenHash: {
      type: String,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

OAuthTokenSchema.index({ tokenHash: 1 }, { unique: true });
OAuthTokenSchema.index({ userId: 1, clientId: 1, type: 1 });
OAuthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OAuthToken: Model<IOAuthToken> =
  mongoose.models.OAuthToken ||
  mongoose.model<IOAuthToken>("OAuthToken", OAuthTokenSchema);

export default OAuthToken;
