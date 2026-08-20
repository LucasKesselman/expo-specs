import { collection, doc, getDoc } from "firebase/firestore";

import { firestore } from "./firebase";
import { firstValidImageUrl } from "./firstValidImageUrl";

const PHYSICAL_DESIGNS_COLLECTION = "PhysicalDesigns";

export function resolvePhysicalDesignThumbnailUrl(
  data: Record<string, unknown>,
): string | null {
  return firstValidImageUrl([
    data.marketplaceThumbnailImageURL,
    data.marketplaceThumbnailUrl,
    data.marketplaceCardImageURL,
    data.marketplaceFullImageUrl,
  ]);
}

export async function fetchPhysicalDesignThumbnails(
  physicalDesignIds: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const uniqueIds = [
    ...new Set(
      physicalDesignIds.filter((id): id is string => typeof id === "string" && Boolean(id)),
    ),
  ];

  const entries = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const snapshot = await getDoc(doc(collection(firestore, PHYSICAL_DESIGNS_COLLECTION), id));
        if (!snapshot.exists()) {
          return [id, null] as const;
        }

        return [id, resolvePhysicalDesignThumbnailUrl(snapshot.data())] as const;
      } catch {
        return [id, null] as const;
      }
    }),
  );

  const thumbnails = new Map<string, string>();
  for (const [id, url] of entries) {
    if (url) {
      thumbnails.set(id, url);
    }
  }

  return thumbnails;
}
