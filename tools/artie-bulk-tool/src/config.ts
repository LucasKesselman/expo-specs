import os from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { ColumnCheckMode, ProcessingMode, RecordUpdateMode } from "./types.js";

export const DEFAULT_PROJECT_ID = "pygmalions-specs";
export const PAGE_SIZE = 500;
export const BULK_WRITER_MAX_ATTEMPTS = 5;
export const DEFAULT_OUTPUT_DIR = path.join(os.homedir(), "Downloads");
export const DEFAULT_ID_COLUMN = "__docId";
export const ID_FALLBACK_COLUMN = "id";

export const RESERVED_HEADERS = ["__docId"] as const;
export const IMMUTABLE_ON_UPDATE = ["createdAt"] as const;
export const AUTO_STAMP_FIELDS = ["lastUpdatedAt"] as const;

export const ALLOWED_COLLECTIONS = [
  "DigitalDesigns",
  "PhysicalDesigns",
  "Garments",
] as const;

export const REF_ALLOWED_COLLECTIONS = [
  "DigitalDesigns",
  "PhysicalDesigns",
  "Garments",
  "Users",
] as const;

export const PROCESSING_MODES: ProcessingMode[] = ["pretend", "active"];

export function requireProcessingMode(value: unknown): ProcessingMode {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("--processingMode is required. Use pretend or active.");
  }
  if (!(PROCESSING_MODES as string[]).includes(value)) {
    throw new Error(
      `Invalid --processingMode "${value}". Use ${PROCESSING_MODES.join(" or ")}.`,
    );
  }
  return value as ProcessingMode;
}

export const RECORD_UPDATE_MODES: RecordUpdateMode[] = [
  "UPDATE_ONLY",
  "CREATE_ONLY",
  "CREATE_AND_UPDATE",
  "SYNC",
];
export const COLUMN_CHECK_MODES: ColumnCheckMode[] = [
  "ALLOW_EXTRA",
  "EXACT_MATCH",
  "ALLOW_MISSING",
  "ALLOW_EXTRA_AND_MISSING",
];

export const TOOL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const REPO_ROOT = path.resolve(TOOL_ROOT, "../..");
export const DEFAULT_SERVICE_ACCOUNT_PATH = path.join(
  REPO_ROOT,
  "scripts",
  "serviceAccountKey.json",
);

export const SYNC_WARNING =
  "⚠️ WARNING: SYNC mode will delete documents in Firestore. Proceed? (y/n)";

/**
 * Resolve an operator-supplied file path.
 * npm --prefix runs with cwd = tools/artie-bulk-tool, so relative paths must
 * use INIT_CWD (the directory the user invoked npm from). Absolute paths and
 * ~/... are never joined onto the tools folder.
 */
export function resolveUserPath(inputPath: string): string {
  const trimmed = inputPath.trim();
  if (!trimmed) {
    throw new Error("Path is empty.");
  }
  if (trimmed === "~") {
    return os.homedir();
  }
  if (trimmed.startsWith("~/") || trimmed.startsWith("~\\")) {
    return path.join(os.homedir(), trimmed.slice(2));
  }
  if (path.isAbsolute(trimmed)) {
    return path.normalize(trimmed);
  }
  const base = process.env.INIT_CWD?.trim() || process.cwd();
  return path.resolve(base, trimmed);
}
