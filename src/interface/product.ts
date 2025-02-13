export interface Product {
  _id: string;
  name: string;
  image?: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
}