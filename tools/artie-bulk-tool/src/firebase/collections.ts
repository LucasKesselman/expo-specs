import { ALLOWED_COLLECTIONS } from "../config.js";

export class CollectionNotAllowedError extends Error {
  constructor(collection: string) {
    super(
      `Collection "${collection}" is not in the allowlist (${ALLOWED_COLLECTIONS.join(", ")}). ` +
        `Pass --allowUnlistedCollection and type the collection name to proceed.`,
    );
    this.name = "CollectionNotAllowedError";
  }
}

export function isAllowedCollection(collection: string): boolean {
  return (ALLOWED_COLLECTIONS as readonly string[]).includes(collection);
}

export function assertTopLevelCollection(collection: string): void {
  if (!collection || collection.includes("/")) {
    throw new Error(
      `Collection must be a top-level collection id (got "${collection}"). Subcollections are out of scope.`,
    );
  }
}
