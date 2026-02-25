/**
 * Firestore writes for the Designs and Garments collections.
 * Document shapes match the Design and Garment types so entries work with
 * marketplace cards (GarmentCard, DesignCard) and detail modals.
 * Collections are created on first write if they don't exist.
 */
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ProductCategory } from "@/types/product";

const DESIGNS_COLLECTION = "Designs";
const GARMENTS_COLLECTION = "Garments";

const DEFAULT_CATEGORIES: ProductCategory[] = ["tees", "new"];

function parseCategories(value: string): ProductCategory[] {
  const raw = value
    .trim()
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean);
  const allowed: ProductCategory[] = [
    "tees",
    "hoodies",
    "accessories",
    "limited-edition",
    "bestseller",
    "new",
  ];
  const filtered = raw.filter((c) => allowed.includes(c as ProductCategory)) as ProductCategory[];
  return filtered.length > 0 ? filtered : DEFAULT_CATEGORIES;
}

export type CreateDesignFields = {
  name: string;
  description?: string;
  image?: string;
  categories?: string;
};

/**
 * Adds a new design to the Firestore Designs collection.
 * Stored document conforms to Design type (id, name, author, created, categories,
 * image, description, price, priceAmount, sku, tags) for use with DesignCard and design detail modal.
 * Author = user email; price = $0.00.
 */
export async function createDesignInFirestore(
  authorEmail: string,
  fields: CreateDesignFields
): Promise<string> {
  const ref = doc(collection(db, DESIGNS_COLLECTION));
  const now = new Date().toISOString();
  const categories = fields.categories ? parseCategories(fields.categories) : DEFAULT_CATEGORIES;
  const docData = {
    id: ref.id,
    name: fields.name.trim() || "Untitled Design",
    author: authorEmail,
    created: now,
    categories,
    image: fields.image?.trim() || "https://picsum.photos/seed/design-new/400/400",
    description: fields.description?.trim() || "",
    price: "$0.00",
    priceAmount: 0,
    sku: `DES-${ref.id.slice(0, 8).toUpperCase()}`,
    tags: ["user-created"],
    active: true,
  };
  await setDoc(ref, docData);
  return ref.id;
}

export type CreateGarmentFields = {
  name: string;
  description?: string;
  image?: string;
  color?: string;
  sizes?: string;
  categories?: string;
  releaseYear?: string;
};

/**
 * Adds a new garment to the Firestore Garments collection.
 * Stored document conforms to Garment type (id, name, sizes, color, sku, author,
 * releaseYear, categories, image, description, price) for use with GarmentCard and garment detail modal.
 * Author = user email; price = $24.99.
 */
export async function createGarmentInFirestore(
  authorEmail: string,
  fields: CreateGarmentFields
): Promise<string> {
  const ref = doc(collection(db, GARMENTS_COLLECTION));
  const sizesRaw = fields.sizes?.trim().split(/[\s,]+/).filter(Boolean) ?? ["S", "M", "L"];
  const sizes = sizesRaw.length > 0 ? sizesRaw : ["S", "M", "L"];
  const year = fields.releaseYear?.trim();
  const releaseYear = year ? parseInt(year, 10) : new Date().getFullYear();
  const categories = fields.categories ? parseCategories(fields.categories) : DEFAULT_CATEGORIES;
  const docData = {
    id: ref.id,
    name: fields.name.trim() || "Untitled Garment",
    sizes,
    color: fields.color?.trim() || "White",
    sku: `GAR-${ref.id.slice(0, 8).toUpperCase()}`,
    author: authorEmail,
    releaseYear: Number.isNaN(releaseYear) ? new Date().getFullYear() : releaseYear,
    categories,
    image: fields.image?.trim() || "https://picsum.photos/seed/garment-new/400/400",
    description: fields.description?.trim() || "",
    price: "$24.99",
    active: true,
  };
  await setDoc(ref, docData);
  return ref.id;
}
