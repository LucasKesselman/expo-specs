const DIGITAL_DESIGNS_COLLECTION = "DigitalDesigns";

export type SavedDigitalDesignReference = {
  id: string;
  path: string;
};

export function normalizeSavedDigitalDesignReference(
  value: unknown,
): SavedDigitalDesignReference | null {
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    if (trimmed.includes("/")) {
      const segments = trimmed.split("/").filter(Boolean);
      if (!segments.length) {
        return null;
      }
      return { id: segments[segments.length - 1], path: trimmed };
    }
    return {
      id: trimmed,
      path: `${DIGITAL_DESIGNS_COLLECTION}/${trimmed}`,
    };
  }

  if (typeof value === "object" && value !== null) {
    const maybePath =
      "path" in value && typeof (value as { path?: unknown }).path === "string"
        ? (value as { path: string }).path.trim()
        : "";
    const maybeId =
      "id" in value && typeof (value as { id?: unknown }).id === "string"
        ? (value as { id: string }).id.trim()
        : "";

    if (maybePath) {
      const segments = maybePath.split("/").filter(Boolean);
      const id = maybeId || (segments.length ? segments[segments.length - 1] : "");
      if (!id) {
        return null;
      }
      return { id, path: maybePath };
    }

    if (maybeId) {
      return {
        id: maybeId,
        path: `${DIGITAL_DESIGNS_COLLECTION}/${maybeId}`,
      };
    }
  }

  return null;
}

export function normalizeSavedDigitalDesignId(value: unknown): string | null {
  return normalizeSavedDigitalDesignReference(value)?.id ?? null;
}

export function isDesignInSavedList(savedArray: unknown, designId: string): boolean {
  if (!designId || !Array.isArray(savedArray)) {
    return false;
  }

  return savedArray.some((entry) => normalizeSavedDigitalDesignId(entry) === designId);
}

/** Values to pass to arrayRemove so plain IDs and path forms both clear. */
export function buildSavedDigitalDesignRemoveValues(designId: string): string[] {
  const trimmed = designId.trim();
  if (!trimmed) {
    return [];
  }

  return Array.from(new Set([trimmed, `${DIGITAL_DESIGNS_COLLECTION}/${trimmed}`]));
}

export function dedupeSavedDigitalDesignReferences(
  savedArray: unknown,
): SavedDigitalDesignReference[] {
  if (!Array.isArray(savedArray)) {
    return [];
  }

  return Array.from(
    savedArray
      .map(normalizeSavedDigitalDesignReference)
      .filter((ref): ref is SavedDigitalDesignReference => ref !== null)
      .reduce((acc, ref) => {
        if (!acc.has(ref.id)) {
          acc.set(ref.id, ref);
        }
        return acc;
      }, new Map<string, SavedDigitalDesignReference>())
      .values(),
  );
}
