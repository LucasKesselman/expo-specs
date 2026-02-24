/**
 * Design product type used in marketplace and when saving to Firestore.
 * Each product has a stable productId and can belong to multiple categories.
 */
export type ProductCategory =
  | "tees"
  | "hoodies"
  | "accessories"
  | "limited-edition"
  | "bestseller"
  | "new";

export interface DesignProduct {
  productId: string;
  name: string;
  description: string;
  price: string;
  priceAmount?: number; // optional numeric for sorting/filtering
  image: string;
  categories: ProductCategory[];
  sku?: string;
}
