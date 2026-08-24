import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { BULK_WRITER_MAX_ATTEMPTS } from "../config.js";
import { assertRefPath } from "../firebase/firestoreService.js";
import { logger } from "../logging.js";
import { isPlainObject, isRefPathValue } from "../mapping/codecs.js";
import { getPath } from "../mapping/flatten.js";
import type { PlannedChange } from "../types.js";

export interface WriteSink {
  create(docId: string, data: Record<string, unknown>): Promise<void>;
  update(docId: string, data: Record<string, unknown>): Promise<void>;
  delete(docId: string): Promise<void>;
  close(): Promise<void>;
}

export class NullWriter implements WriteSink {
  async create(): Promise<void> {}
  async update(): Promise<void> {}
  async delete(): Promise<void> {}
  async close(): Promise<void> {}
}

export class BulkWriterSink implements WriteSink {
  private readonly writer: ReturnType<Firestore["bulkWriter"]>;
  private readonly collection: ReturnType<Firestore["collection"]>;

  constructor(db: Firestore, collectionName: string) {
    this.collection = db.collection(collectionName);
    this.writer = db.bulkWriter();
    this.writer.onWriteError((error) => error.failedAttempts < BULK_WRITER_MAX_ATTEMPTS);
  }

  create(docId: string, data: Record<string, unknown>): Promise<void> {
    return this.writer.create(this.collection.doc(docId), data).then(() => undefined);
  }

  update(docId: string, data: Record<string, unknown>): Promise<void> {
    return this.writer.update(this.collection.doc(docId), data).then(() => undefined);
  }

  delete(docId: string): Promise<void> {
    return this.writer.delete(this.collection.doc(docId)).then(() => undefined);
  }

  async close(): Promise<void> {
    await this.writer.close();
  }
}

function toFirestoreValue(db: Firestore, value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }
  if (value instanceof Date) {
    return Timestamp.fromDate(value);
  }
  if (isRefPathValue(value)) {
    const parsed = assertRefPath(value.__refPath);
    return db.doc(`${parsed.collection}/${parsed.id}`);
  }
  if (Array.isArray(value)) {
    return value.map((item) => toFirestoreValue(db, item));
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      const converted = toFirestoreValue(db, nested);
      if (converted !== undefined) {
        out[key] = converted;
      }
    }
    return out;
  }
  return value;
}

function stampCreate(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data };
  if (out.createdAt === undefined) {
    out.createdAt = FieldValue.serverTimestamp();
  }
  out.lastUpdatedAt = FieldValue.serverTimestamp();
  return out;
}

function stampUpdate(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data };
  delete out.createdAt;
  out.lastUpdatedAt = FieldValue.serverTimestamp();
  return out;
}

function toDottedUpdate(
  db: Firestore,
  payload: Record<string, unknown>,
  presentPaths: string[],
): Record<string, unknown> {
  const update: Record<string, unknown> = {};
  for (const fieldPath of presentPaths) {
    if (fieldPath === "createdAt" || fieldPath === "lastUpdatedAt") {
      continue;
    }
    const converted = toFirestoreValue(db, getPath(payload, fieldPath));
    if (converted !== undefined) {
      update[fieldPath] = converted;
    }
  }
  return stampUpdate(update);
}

function markFailed(change: PlannedChange, error: unknown): void {
  const message = error instanceof Error ? error.message : "Write failed";
  logger.error(`Write failed for ${change.docId}`, { action: change.action, message });
  change.action = "ERROR";
  change.error = message;
}

export async function applyPlan(
  db: Firestore,
  collectionName: string,
  plan: PlannedChange[],
  sink: WriteSink = new BulkWriterSink(db, collectionName),
): Promise<void> {
  try {
    for (const change of plan) {
      if (change.action !== "CREATE" && change.action !== "UPDATE" && change.action !== "DELETE") {
        continue;
      }
      try {
        let write: Promise<void>;
        if (change.action === "CREATE") {
          const payload = stampCreate(
            toFirestoreValue(db, change.payload ?? {}) as Record<string, unknown>,
          );
          write = sink.create(change.docId, payload);
        } else if (change.action === "UPDATE") {
          const payload = toDottedUpdate(db, change.payload ?? {}, change.presentPaths ?? []);
          write = sink.update(change.docId, payload);
        } else {
          write = sink.delete(change.docId);
        }
        // Do not await here: BulkWriter only flushes on close() / batch fill.
        // Awaiting each op before close() deadlocks for small import plans.
        write.catch((error: unknown) => {
          markFailed(change, error);
        });
      } catch (error) {
        markFailed(change, error);
      }
    }
  } finally {
    await sink.close();
  }
}
