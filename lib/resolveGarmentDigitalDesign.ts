import { doc, getDoc } from "firebase/firestore";

import { firestore } from "./firebase";
import {
  mapFirestoreDocToMarketplaceDesign,
  type MarketplaceDesign,
} from "../types/marketplaceDesign";

const GARMENTS_COLLECTION = "Garments";
const DIGITAL_DESIGNS_COLLECTION = "DigitalDesigns";

export function normalizeGarmentIdFromQrPayload(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.includes("/")) {
    const segments = trimmed.split("/").filter(Boolean);
    return segments.length ? segments[segments.length - 1] : trimmed;
  }

  return trimmed;
}

function normalizeLinkedDocumentId(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    const segments = value.split("/").filter(Boolean);
    return segments.length ? segments[segments.length - 1] : value.trim();
  }

  if (typeof value === "object" && value !== null && "id" in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string" && id.trim()) {
      return id.trim();
    }
  }

  return null;
}

function normalizeLinkedDocumentPath(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "object" && value !== null && "path" in value) {
    const path = (value as { path?: unknown }).path;
    if (typeof path === "string" && path.trim()) {
      return path.trim();
    }
  }

  return null;
}

export type GarmentDigitalDesignResult =
  | { ok: true; garmentId: string; design: MarketplaceDesign }
  | { ok: false; error: string };

export async function loadGarmentAndDigitalDesign(
  garmentId: string,
): Promise<GarmentDigitalDesignResult> {
  const normalizedId = garmentId.trim();
  if (!normalizedId) {
    return { ok: false, error: "Empty garment ID from QR code." };
  }

  const garmentSnap = await getDoc(doc(firestore, GARMENTS_COLLECTION, normalizedId));
  if (!garmentSnap.exists()) {
    return { ok: false, error: `No garment found for ID: ${normalizedId}` };
  }

  const data = garmentSnap.data() ?? {};
  const digitalDesignPath = normalizeLinkedDocumentPath(data.digitalDesign);
  const digitalDesignId = normalizeLinkedDocumentId(data.digitalDesign);

  const designPath =
    digitalDesignPath ||
    (digitalDesignId ? `${DIGITAL_DESIGNS_COLLECTION}/${digitalDesignId}` : null);

  if (!designPath) {
    return { ok: false, error: "Garment has no digital design." };
  }

  const pathSegments = designPath.split("/").filter(Boolean);
  if (pathSegments.length < 2) {
    return { ok: false, error: `Invalid digital design path: ${designPath}` };
  }

  const designRef = doc(firestore, pathSegments[0], ...pathSegments.slice(1));
  const designSnap = await getDoc(designRef);
  if (!designSnap.exists()) {
    return {
      ok: false,
      error: `Linked digital design not found for garment ${normalizedId}.`,
    };
  }

  const sourceCollection = pathSegments[0] || DIGITAL_DESIGNS_COLLECTION;

  return {
    ok: true,
    garmentId: normalizedId,
    design: mapFirestoreDocToMarketplaceDesign(designSnap, sourceCollection),
  };
}
