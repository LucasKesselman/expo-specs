const GARMENTS_COLLECTION = "Garments";

export type OwnedGarmentReference = {
  garmentId: string;
  garmentPath?: string;
};

export function normalizeOwnedGarmentReference(
  value: unknown,
): OwnedGarmentReference | null {
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    const segments = trimmed.split("/").filter(Boolean);
    const garmentId = segments.length ? segments[segments.length - 1] : trimmed;
    const garmentPath = trimmed.includes("/") ? trimmed : undefined;
    return { garmentId, garmentPath };
  }

  if (typeof value === "object" && value !== null) {
    if ("id" in value && typeof (value as { id?: unknown }).id === "string") {
      const garmentId = ((value as { id: string }).id || "").trim();
      if (!garmentId) {
        return null;
      }

      const garmentPath =
        "path" in value && typeof (value as { path?: unknown }).path === "string"
          ? (value as { path: string }).path.trim() || undefined
          : undefined;

      return { garmentId, garmentPath };
    }

    if ("path" in value && typeof (value as { path?: unknown }).path === "string") {
      const path = (value as { path: string }).path.trim();
      if (!path) {
        return null;
      }
      const segments = path.split("/").filter(Boolean);
      if (!segments.length) {
        return null;
      }

      return {
        garmentId: segments[segments.length - 1],
        garmentPath: path,
      };
    }
  }

  return null;
}

export function dedupeOwnedGarmentReferences(rawArray: unknown): OwnedGarmentReference[] {
  if (!Array.isArray(rawArray)) {
    return [];
  }

  return Array.from(
    rawArray
      .map(normalizeOwnedGarmentReference)
      .filter((ref): ref is OwnedGarmentReference => ref !== null)
      .reduce((acc, reference) => {
        const dedupeKey = reference.garmentPath ?? reference.garmentId;
        if (!acc.has(dedupeKey)) {
          acc.set(dedupeKey, reference);
        }
        return acc;
      }, new Map<string, OwnedGarmentReference>())
      .values(),
  );
}

export function garmentCollectionPath(garmentId: string): string {
  return `${GARMENTS_COLLECTION}/${garmentId}`;
}
