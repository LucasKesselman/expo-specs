/**
 * Design product types for the marketplace and saved-designs flows.
 * DesignProduct is the canonical shape for catalog items and saved designs.
 */
export type ProductCategory =
  | "tees"
  | "hoodies"
  | "accessories"
  | "limited-edition"
  | "bestseller"
  | "new";

/**
 * A design product (e.g. a tee) with stable id and display fields.
 * Used in PRODUCTS catalog and when saving/loading from Firestore.
 */
export interface DesignProduct {
  /** Stable id; use when saving to Firestore. */
  productId: string;
  name: string;
  description: string;
  /** Display price string (e.g. "$24.99"). */
  price: string;
  /** Optional numeric price for sorting/filtering. */
  priceAmount?: number;
  image: string;
  categories: ProductCategory[];
  sku?: string;
}
