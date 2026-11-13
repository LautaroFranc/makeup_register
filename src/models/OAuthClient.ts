import mongoose, { Schema, Document, Model } from "mongoose";

export type OAuthTokenAuthMethod =
  | "none"
  | "client_secret_post"
  | "client_secret_basic";

/**
 * Cliente OAuth registrado por Claude/ChatGPT (Dynamic Client Registration).
 *
 * El client_id es público. Si el cliente pidió `client_secret_post` o
 * `client_secret_basic`, guardamos solo el hash del secreto: el valor en claro
 * se devuelve una única vez en la respuesta del registro.
 */
export interface IOAuthClient extends Document {
  clientId: string;
  clientSecretHash?: string;
  clientName?: string;
  redirectUris: string[];
  grantTypes: string[];
  responseTypes: string[];
  tokenEndpointAuthMethod: OAuthTokenAuthMethod;
  softwareId?: string;
  softwareVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OAuthClientSchema: Schema<IOAuthClient> = new Schema(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    clientSecretHash: {
      type: String,
    },
    clientName: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    redirectUris: {
      type: [String],
      required: true,
      default: [],
    },
    grantTypes: {
      type: [String],
      default: ["authorization_code", "refresh_token"],
    },
    responseTypes: {
      type: [String],
      default: ["code"],
    },
    tokenEndpointAuthMethod: {
      type: String,
      enum: ["none", "client_secret_post", "client_secret_basic"],
      default: "none",
    },
    softwareId: {
      type: String,
      trim: true,
    },
    softwareVersion: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

OAuthClientSchema.index({ clientId: 1 }, { unique: true });

const OAuthClient: Model<IOAuthClient> =
  mongoose.models.OAuthClient ||
  mongoose.model<IOAuthClient>("OAuthClient", OAuthClientSchema);

export default OAuthClient;
