import { DEFAULT_ID_COLUMN, ID_FALLBACK_COLUMN } from "../config.js";

export interface ResolvedDocId {
  docId: string;
  warning?: string;
}

export function resolveRowDocId(
  cells: Record<string, unknown>,
  idColumn: string = DEFAULT_ID_COLUMN,
): ResolvedDocId | { error: string } {
  const primary = cells[idColumn];
  if (primary instanceof Date) {
    return { error: `${idColumn} looks like an Excel date serial; expected a document id string.` };
  }

  const primaryId = stringifyId(primary);
  if (primaryId) {
    return { docId: primaryId };
  }

  const fallback = cells[ID_FALLBACK_COLUMN];
  if (fallback instanceof Date) {
    return { error: `${ID_FALLBACK_COLUMN} looks like an Excel date serial; expected a document id string.` };
  }
  const fallbackId = stringifyId(fallback);
  if (fallbackId) {
    return {
      docId: fallbackId,
      warning: `${idColumn} was blank; fell back to ${ID_FALLBACK_COLUMN}=${fallbackId}`,
    };
  }

  return { error: `Missing ${idColumn} (and no ${ID_FALLBACK_COLUMN} fallback).` };
}

function stringifyId(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  return String(value).trim();
}
