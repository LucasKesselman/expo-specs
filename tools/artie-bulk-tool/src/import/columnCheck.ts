import { RESERVED_HEADERS } from "../config.js";
import type { ColumnCheckMode } from "../types.js";

export class ColumnCheckError extends Error {
  extra: string[];
  missing: string[];
  mode: ColumnCheckMode;

  constructor(args: { mode: ColumnCheckMode; extra: string[]; missing: string[] }) {
    const parts: string[] = [`Column check failed (${args.mode}).`];
    if (args.extra.length) {
      parts.push(`Extra columns: ${args.extra.join(", ")}`);
    }
    if (args.missing.length) {
      parts.push(`Missing columns: ${args.missing.join(", ")}`);
    }
    super(parts.join(" "));
    this.name = "ColumnCheckError";
    this.mode = args.mode;
    this.extra = args.extra;
    this.missing = args.missing;
  }
}

export function checkColumns(args: {
  excelHeaders: string[];
  dbFieldPaths: string[];
  mode: ColumnCheckMode;
  reserved?: readonly string[];
}): { extra: string[]; missing: string[] } {
  const reserved = new Set(args.reserved ?? RESERVED_HEADERS);
  const sheet = new Set(args.excelHeaders.filter((header) => header && !reserved.has(header)));
  const db = new Set(args.dbFieldPaths);
  const extra = [...sheet].filter((header) => !db.has(header)).sort();
  const missing = [...db].filter((header) => !sheet.has(header)).sort();

  const extraForbidden = args.mode === "EXACT_MATCH" || args.mode === "ALLOW_MISSING";
  const missingForbidden = args.mode === "EXACT_MATCH" || args.mode === "ALLOW_EXTRA";

  if ((extraForbidden && extra.length > 0) || (missingForbidden && missing.length > 0)) {
    throw new ColumnCheckError({ mode: args.mode, extra, missing });
  }

  return { extra, missing };
}
