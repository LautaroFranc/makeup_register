export interface Product {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  images?: string[];
  attributes?: {
    [key: string]: string[];
  };
  buyPrice: string;
  sellPrice: string;
  stock: number;
  code: string;
  barcode: string;
  category: string;
  user: string;
  published: boolean;
  hasDiscount?: boolean;
  discountPercentage?: number;
  discountedPrice?: string;
  discountStartDate?: string;
  discountEndDate?: string;
  createdAt?: string;
  updatedAt?: string;
}
