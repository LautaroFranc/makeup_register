import mongoose, { Schema, Document, Model } from "mongoose";

export interface IComboItem {
  product: mongoose.Types.ObjectId;
  productName: string; // snapshot del nombre al crear
  quantity: number;
  unitSellPrice: number; // snapshot del precio al crear
}

export interface ICombo extends Document {
  name: string;
  description?: string;
  image?: string;
  images?: string[];
  items: IComboItem[];
  totalNormalPrice: number; // suma(qty * unitSellPrice) — calculado al guardar
  comboPrice: number; // precio especial definido por el dueño
  savings: number; // totalNormalPrice - comboPrice
  user: mongoose.Types.ObjectId;
  store: mongoose.Types.ObjectId;
  published: boolean;
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  // Opciones de stock
  allowOversell: boolean; // permite venta aunque falte stock (pre-venta/backorder)
  autoHideWhenOutOfStock: boolean; // oculta en tienda si falta stock en algún componente
  createdAt?: Date;
  updatedAt?: Date;
}

const ComboItemSchema = new Schema<IComboItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "La cantidad debe ser al menos 1"],
    },
    unitSellPrice: {
      type: Number,
      required: true,
      min: [0, "El precio no puede ser negativo"],
    },
  },
  { _id: false }
);

const ComboSchema = new Schema<ICombo>(
  {
    name: {
      type: String,
      required: [true, "El nombre del combo es requerido"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    images: {
      type: [String],
      default: [],
    },
    items: {
      type: [ComboItemSchema],
      required: true,
      validate: {
        validator: (items: IComboItem[]) => items.length >= 2,
        message: "Un combo debe tener al menos 2 productos",
      },
    },
    totalNormalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    comboPrice: {
      type: Number,
      required: [true, "El precio del combo es requerido"],
      min: [0, "El precio no puede ser negativo"],
    },
    savings: {
      type: Number,
      default: 0,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    published: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    allowOversell: {
      type: Boolean,
      default: false,
    },
    autoHideWhenOutOfStock: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

ComboSchema.index({ user: 1, store: 1 });
ComboSchema.index({ user: 1, isActive: 1, published: 1 });

const Combo: Model<ICombo> =
  mongoose.models.Combo || mongoose.model<ICombo>("Combo", ComboSchema);

export default Combo;
