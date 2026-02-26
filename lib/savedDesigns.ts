/**
 * Firestore helpers for the user saved-designs subcollection
 * (users/{userId}/savedDesigns). Used by useSaveDesign and useSavedDesigns.
 */
import {
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  limit,
  serverTimestamp,
  type DocumentReference,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DesignProduct } from "@/types/product";

/** Firestore document shape for a saved design (no id; id comes from doc ref). */
export interface SavedDesignDoc {
  productId: string;
  product: DesignProduct;
  savedAt: Timestamp;
}

/** Client-facing saved design with Firestore document id */
export interface SavedDesignWithId extends SavedDesignDoc {
  id: string;
}

/**
 * Path to the saved designs subcollection for a user.
 * Firestore: users/{userId}/savedDesigns/{savedDesignId}
 */
export function userSavedDesignsRef(userId: string) {
  return collection(db, "users", userId, "savedDesigns");
}

/**
 * Fetches all saved designs for a user, newest first.
 * Sorts in memory to avoid requiring a Firestore index.
 */
export async function getSavedDesignsForUser(
  userId: string
): Promise<SavedDesignWithId[]> {
  const savedDesigns = userSavedDesignsRef(userId);
  const snapshot = await getDocs(savedDesigns);
  const list: SavedDesignWithId[] = snapshot.docs
    .map((doc) => {
      const data = doc.data();
      const product = data.product;
      if (!product || typeof product !== "object" || !product.productId || !product.name) {
        return null;
      }
      return {
        id: doc.id,
        productId: data.productId ?? product.productId,
        product: product as DesignProduct,
        savedAt: data.savedAt,
      } as SavedDesignWithId;
    })
    .filter((item): item is SavedDesignWithId => item !== null);
  list.sort((a, b) => {
    const tA = a.savedAt?.toMillis?.() ?? 0;
    const tB = b.savedAt?.toMillis?.() ?? 0;
    return tB - tA;
  });
  return list;
}

/**
 * Saves a design to the current user's saved designs in Firestore.
 * If the user already has a saved design with the same productId, returns that
 * document's reference (no duplicate). Otherwise creates a new document.
 * @returns The Firestore document reference (existing or newly created)
 */
export async function saveDesignForUser(
  userId: string,
  product: DesignProduct
): Promise<DocumentReference> {
  const savedDesigns = userSavedDesignsRef(userId);
  const existing = query(
    savedDesigns,
    where("productId", "==", product.productId),
    limit(1)
  );
  const snapshot = await getDocs(existing);
  if (!snapshot.empty) {
    return snapshot.docs[0].ref;
  }
  const docRef = await addDoc(savedDesigns, {
    productId: product.productId,
    product: {
      productId: product.productId,
      name: product.name,
      description: product.description,
      price: product.price,
      priceAmount: product.priceAmount ?? null,
      image: product.image,
      categories: product.categories,
      sku: product.sku ?? null,
    },
    savedAt: serverTimestamp(),
  });
  return docRef;
}

/**
 * Removes a saved design from the user's collection in Firestore.
 */
export async function removeSavedDesign(
  userId: string,
  savedDesignId: string
): Promise<void> {
  const docRef = doc(db, "users", userId, "savedDesigns", savedDesignId);
  await deleteDoc(docRef);
}
