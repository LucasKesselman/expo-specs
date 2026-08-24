import { FieldPath, type Firestore } from "firebase-admin/firestore";
import { PAGE_SIZE, REF_ALLOWED_COLLECTIONS } from "../config.js";
import { logger } from "../logging.js";

export async function loadCollectionMap(
  db: Firestore,
  collectionName: string,
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  const col = db.collection(collectionName);
  let lastId: string | undefined;

  for (;;) {
    let query = col.orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
    if (lastId) {
      query = query.startAfter(lastId);
    }
    const snapshot = await query.get();
    if (snapshot.empty) {
      break;
    }
    for (const doc of snapshot.docs) {
      map.set(doc.id, (doc.data() ?? {}) as Record<string, unknown>);
    }
    lastId = snapshot.docs[snapshot.docs.length - 1].id;
    logger.info(`Loaded ${map.size} documents from ${collectionName}...`);
    if (snapshot.size < PAGE_SIZE) {
      break;
    }
  }

  return map;
}

export function assertRefPath(refPath: string): { collection: string; id: string } {
  const parts = refPath.split("/").filter(Boolean);
  if (parts.length !== 2) {
    throw new Error(
      `Document reference must be exactly two segments (collection/id). Got "${refPath}".`,
    );
  }
  const [collection, id] = parts;
  if (!(REF_ALLOWED_COLLECTIONS as readonly string[]).includes(collection)) {
    throw new Error(
      `Document reference collection "${collection}" is not allowed (path: ${refPath}).`,
    );
  }
  return { collection, id };
}
