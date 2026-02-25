import { useState, useEffect, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Design } from "@/types/design";
import type { Garment } from "@/types/garment";
import type { ProductCategory } from "@/types/product";

const DESIGNS_COLLECTION = "Designs";
const GARMENTS_COLLECTION = "Garments";

const ALLOWED_CATEGORIES: ProductCategory[] = [
  "tees",
  "hoodies",
  "accessories",
  "limited-edition",
  "bestseller",
  "new",
];

/**
 * Normalizes a Firestore document's `created` field to an ISO date string.
 * Handles both Timestamp and string values from the database.
 */
function toCreatedString(value: unknown): string {
  if (typeof value === "string") return value;
  const ts = value as Timestamp | undefined;
  if (ts?.toDate) return ts.toDate().toISOString();
  return new Date().toISOString();
}

/**
 * Ensures categories from Firestore are a valid ProductCategory array.
 */
function normalizeCategories(raw: unknown): ProductCategory[] {
  if (!Array.isArray(raw)) return ["tees", "new"];
  return raw.filter((c): c is ProductCategory =>
    typeof c === "string" && ALLOWED_CATEGORIES.includes(c as ProductCategory)
  ) as ProductCategory[];
}

/**
 * Maps a Firestore design document to the Design type.
 * Uses doc.id when the document id is not present in data.
 */
function mapDesignDoc(
  docId: string,
  data: Record<string, unknown>
): Design {
  const categories = normalizeCategories(data.categories);
  return {
    id: (data.id as string) ?? docId,
    name: (data.name as string) ?? "Untitled Design",
    author: (data.author as string) ?? "",
    created: toCreatedString(data.created),
    categories: categories.length ? categories : ["tees", "new"],
    image: typeof data.image === "string" ? data.image : "https://picsum.photos/seed/design/400/400",
    description: typeof data.description === "string" ? data.description : "",
    price: typeof data.price === "string" ? data.price : "$0.00",
    priceAmount: typeof data.priceAmount === "number" ? data.priceAmount : undefined,
    sku: typeof data.sku === "string" ? data.sku : undefined,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
    active: data.active !== false,
  };
}

/**
 * Maps a Firestore garment document to the Garment type.
 */
function mapGarmentDoc(
  docId: string,
  data: Record<string, unknown>
): Garment {
  const categories = normalizeCategories(data.categories);
  const sizes = Array.isArray(data.sizes)
    ? (data.sizes as string[]).filter((s) => typeof s === "string")
    : ["S", "M", "L"];
  return {
    id: (data.id as string) ?? docId,
    name: (data.name as string) ?? "Untitled Garment",
    sizes: sizes.length ? sizes : ["S", "M", "L"],
    color: typeof data.color === "string" ? data.color : "White",
    sku: typeof data.sku === "string" ? data.sku : `GAR-${docId.slice(0, 8)}`,
    author: (data.author as string) ?? "",
    releaseYear: typeof data.releaseYear === "number" ? data.releaseYear : new Date().getFullYear(),
    categories: categories.length ? categories : ["tees", "new"],
    image: typeof data.image === "string" ? data.image : "https://picsum.photos/seed/garment/400/400",
    description: typeof data.description === "string" ? data.description : undefined,
    price: typeof data.price === "string" ? data.price : undefined,
    active: data.active !== false,
  };
}

/**
 * Fetches active designs from the Designs collection.
 * Filters in memory for active !== false so documents without the field still appear.
 */
async function fetchDesigns(): Promise<Design[]> {
  const coll = collection(db, DESIGNS_COLLECTION);
  const snapshot = await getDocs(coll);
  const list: Design[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const design = mapDesignDoc(doc.id, data);
    if (design.active !== false) list.push(design);
  });
  return list;
}

/**
 * Fetches active garments from the Garments collection.
 */
async function fetchGarments(): Promise<Garment[]> {
  const coll = collection(db, GARMENTS_COLLECTION);
  const snapshot = await getDocs(coll);
  const list: Garment[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const garment = mapGarmentDoc(doc.id, data);
    if (garment.active !== false) list.push(garment);
  });
  return list;
}

export type UseCatalogFromFirestoreResult = {
  /** Designs from Firestore (active only). Empty until loaded or on error. */
  designs: Design[];
  /** Garments from Firestore (active only). Empty until loaded or on error. */
  garments: Garment[];
  /** True during the initial load only (no data yet). */
  loading: boolean;
  /** True while a user-triggered refresh (e.g. pull-to-refresh) is in progress. */
  refreshing: boolean;
  /** Error message if the last fetch failed; null otherwise. */
  error: string | null;
  /** Call to refetch designs and garments (e.g. for pull-to-refresh). */
  refresh: () => Promise<void>;
};

/**
 * Loads the marketplace catalog (Designs and Garments) from Firestore.
 *
 * Fetches once on mount. Does not refetch on tab focus; use the returned
 * `refresh` for pull-to-refresh so we only hit the database when the user
 * requests new data or on first load.
 *
 * @returns designs, garments, loading, refreshing, error, refresh
 */
export function useCatalogFromFirestore(): UseCatalogFromFirestoreResult {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isUserRefresh: boolean) => {
    if (isUserRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [designsList, garmentsList] = await Promise.all([
        fetchDesigns(),
        fetchGarments(),
      ]);
      setDesigns(designsList);
      setGarments(garmentsList);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load catalog.";
      setError(message);
      setDesigns([]);
      setGarments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /** Refetch catalog (e.g. pull-to-refresh). Uses refreshing state for the native spinner. */
  const refresh = useCallback(() => load(true), [load]);

  useEffect(() => {
    load(false);
  }, [load]);

  return {
    designs,
    garments,
    loading,
    refreshing,
    error,
    refresh,
  };
}
