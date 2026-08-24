import { decodeCsvValue } from "./codecs.js";
import { getPath, setPath } from "./flatten.js";
import { RESERVED_HEADERS } from "../config.js";

export function unflattenRow(
  row: Record<string, unknown>,
  existingOrHint?: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reserved = new Set<string>(RESERVED_HEADERS);
  for (const [path, raw] of Object.entries(row)) {
    if (reserved.has(path)) {
      continue;
    }
    if (raw === "" || raw === null || raw === undefined) {
      continue;
    }
    const hint = existingOrHint ? getPath(existingOrHint, path) : undefined;
    const decoded = decodeCsvValue(raw, hint);
    if (decoded === undefined) {
      continue;
    }
    setPath(result, path.split("."), decoded);
  }
  return result;
}

export function presentFieldPaths(row: Record<string, unknown>, extraColumns: Set<string>): string[] {
  const reserved = new Set<string>(RESERVED_HEADERS);
  const paths: string[] = [];
  for (const [path, raw] of Object.entries(row)) {
    if (reserved.has(path) || extraColumns.has(path)) {
      continue;
    }
    if (raw === "" || raw === null || raw === undefined) {
      continue;
    }
    paths.push(path);
  }
  return paths;
}
