/**
 * Design entity for front-end display and back-end/database tracking.
 * Used in the Designs marketplace and when saving designs to a user's collection.
 */
import type { ProductCategory } from "./product";

export interface Design {
  /** Unique id for DB and front-end (e.g. Firestore document id). */
  id: string;
  name: string;
  /** Creator / designer user id or display name. */
  author: string;
  /** ISO date string when the design was created. */
  created: string;
  categories: ProductCategory[];
  /** Image URL for card and detail view. */
  image: string;
  description: string;
  /** Display price (e.g. "$12.99"). */
  price: string;
  /** Optional numeric price for sorting. */
  priceAmount?: number;
  /** Optional SKU for inventory. */
  sku?: string;
  /** Optional tags for search/filter. */
  tags?: string[];
  /** If false, hide from marketplace. Default true when omitted. */
  active?: boolean;
}
