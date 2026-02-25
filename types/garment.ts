/**
 * Garment entity for front-end display and back-end/database tracking.
 * Used in the Threads marketplace (tees, hoodies, etc.).
 */
import type { ProductCategory } from "./product";

export interface Garment {
  /** Unique id for DB and front-end. */
  id: string;
  name: string;
  /** Available sizes (e.g. ["XS", "S", "M", "L", "XL"]). */
  sizes: string[];
  /** Primary color name or hex. */
  color: string;
  /** Stock keeping unit for inventory. */
  sku: string;
  /** Brand or creator. */
  author: string;
  /** Release or model year. */
  releaseYear: number;
  categories: ProductCategory[];
  /** Image URL for card and detail view. */
  image: string;
  /** Optional short description. */
  description?: string;
  /** Optional display price. */
  price?: string;
}
