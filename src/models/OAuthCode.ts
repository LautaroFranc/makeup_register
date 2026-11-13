import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Código de autorización OAuth de vida corta (5 minutos).
 *
 * Se guarda hasheado, es de un solo uso y queda atado al client, al redirect
 * URI, al resource (RFC 8707) y al code_challenge de PKCE. El TTL de Mongo
 * borra los códigos vencidos solos.
 */
export interface IOAuthCode extends Document {
  codeHash: string;
  clientId: string;
  userId: mongoose.Types.ObjectId;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
  resource: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

const OAuthCodeSchema: Schema<IOAuthCode> = new Schema(
  {
    codeHash: {
      type: String,
      required: true,
      unique: true,
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
    redirectUri: {
      type: String,
      required: true,
    },
    codeChallenge: {
      type: String,
      required: true,
    },
    codeChallengeMethod: {
      type: String,
      default: "S256",
    },
    scope: {
      type: String,
      default: "mcp:read",
    },
    resource: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

OAuthCodeSchema.index({ codeHash: 1 }, { unique: true });
OAuthCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OAuthCode: Model<IOAuthCode> =
  mongoose.models.OAuthCode ||
  mongoose.model<IOAuthCode>("OAuthCode", OAuthCodeSchema);

export default OAuthCode;
