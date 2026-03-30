import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from "firebase/firestore";

export interface MarketplaceDesign {
  sourceDocId: string;
  sourceCollection: string;
  documentId: string;
  name: string;
  description: string;
  updatedAt: string;
  price: string;
  thumbnailUrl: string | null;
  miniImageUrl: string | null;
  fullImageUrl: string | null;
  imageUrl: string | null;
  createdAt: string;
}

function formatPrice(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `$${(value / 100).toFixed(2)}`;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return `$${(parsed / 100).toFixed(2)}`;
    }
    return value;
  }

  return "N/A";
}

function formatCreatedAt(value: unknown): string {
  if (!value) {
    return "N/A";
  }

  if (value instanceof Date) {
    return value.toLocaleDateString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toLocaleDateString();
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toLocaleDateString();
  }

  return "N/A";
}

export function mapFirestoreDocToMarketplaceDesign(
  doc: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>,
  sourceCollection: string,
): MarketplaceDesign {
  const data = doc.data() ?? {};

  const firstValidString = (candidates: unknown[]): string | null => {
    for (const value of candidates) {
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }
    return null;
  };

  const thumbnailUrl = firstValidString([
    data.marketplaceThumbnailImageURL,
    data.marketplaceThumbnailUrl,
  ]);
  const miniImageUrl = firstValidString([
    data.marketplaceMiniImageURL,
    data.marketplaceMiniImageUrl,
    data.marketplaceMiniUrl,
  ]);
  const fullImageUrl = firstValidString([
    data.marketplaceCardImageURL,
    data.marketplaceFullImageUrl,
  ]);

  return {
    sourceDocId: doc.id,
    sourceCollection,
    documentId: firstValidString([data.id]) ?? doc.id,
    name: firstValidString([data.name]) ?? "Untitled design",
    description: firstValidString([data.description]) ?? "No description provided.",
    updatedAt: formatCreatedAt(data.lastUpdatedAt),
    price: formatPrice(data.priceAmount),
    thumbnailUrl,
    miniImageUrl,
    fullImageUrl,
    imageUrl: fullImageUrl,
    createdAt: formatCreatedAt(data.createdAt),
  };
}
