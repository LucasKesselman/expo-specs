import { AUTO_STAMP_FIELDS, DEFAULT_ID_COLUMN, IMMUTABLE_ON_UPDATE } from "../config.js";
import { logger } from "../logging.js";
import { getPath, PathCollisionError, setPath } from "../mapping/flatten.js";
import { inferFieldPaths } from "../mapping/schema.js";
import { presentFieldPaths, unflattenRow } from "../mapping/unflatten.js";
import type {
  ExcelRow,
  FieldDiff,
  PlannedChange,
  RecordUpdateMode,
} from "../types.js";
import { diffFields } from "./diffEngine.js";
import { resolveRowDocId } from "./match.js";

function baseChange(args: {
  rowNumber: number | null;
  docId: string;
}): Pick<PlannedChange, "rowNumber" | "docId"> {
  return { rowNumber: args.rowNumber, docId: args.docId };
}

function errorChange(
  args: { rowNumber: number | null; docId: string },
  message: string,
  diffs: FieldDiff[] = [],
): PlannedChange {
  return { ...baseChange(args), action: "ERROR", diffs, error: message };
}

function pickPresent(
  incoming: Record<string, unknown>,
  presentPaths: string[],
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const path of presentPaths) {
    const segments = path.split(".");
    const value = path.split(".").reduce<unknown>((current, segment) => {
      if (current === null || current === undefined || typeof current !== "object") {
        return undefined;
      }
      return (current as Record<string, unknown>)[segment];
    }, incoming);
    setPath(picked, segments, value);
  }
  return picked;
}

export function planRow(args: {
  rowNumber: number;
  docId: string;
  existing?: Record<string, unknown>;
  incoming: Record<string, unknown>;
  presentPaths: string[];
  mode: RecordUpdateMode;
}): PlannedChange {
  const exists = args.existing !== undefined;
  const comparablePaths = args.presentPaths.filter(
    (path) => !(AUTO_STAMP_FIELDS as readonly string[]).includes(path),
  );
  const diffs = diffFields(args.existing, args.incoming, comparablePaths);
  const createdAtDiff = diffs.find((diff) =>
    (IMMUTABLE_ON_UPDATE as readonly string[]).includes(diff.fieldPath),
  );

  if (exists && createdAtDiff) {
    return errorChange(args, "createdAt is immutable on UPDATE", diffs);
  }

  if (args.mode === "CREATE_ONLY") {
    if (exists) {
      return errorChange(args, "Document already exists (CREATE_ONLY)");
    }
    return {
      ...baseChange(args),
      action: "CREATE",
      diffs,
      payload: args.incoming,
      presentPaths: comparablePaths,
    };
  }

  if (args.mode === "UPDATE_ONLY") {
    if (!exists) {
      return errorChange(args, "Document not found (UPDATE_ONLY)");
    }
    if (diffs.length === 0) {
      return { ...baseChange(args), action: "SKIP", diffs: [] };
    }
    return {
      ...baseChange(args),
      action: "UPDATE",
      diffs,
      payload: pickPresent(args.incoming, comparablePaths),
      presentPaths: comparablePaths,
    };
  }

  if (!exists) {
    return {
      ...baseChange(args),
      action: "CREATE",
      diffs,
      payload: args.incoming,
      presentPaths: comparablePaths,
    };
  }
  if (diffs.length === 0) {
    return { ...baseChange(args), action: "SKIP", diffs: [] };
  }
  return {
    ...baseChange(args),
    action: "UPDATE",
    diffs,
    payload: pickPresent(args.incoming, comparablePaths),
    presentPaths: comparablePaths,
  };
}

export function planSyncDeletes(
  firestoreIds: Iterable<string>,
  excelIds: Set<string>,
): PlannedChange[] {
  const deletes: PlannedChange[] = [];
  for (const docId of firestoreIds) {
    if (!excelIds.has(docId)) {
      deletes.push({
        rowNumber: null,
        docId,
        action: "DELETE",
        diffs: [],
      });
    }
  }
  return deletes;
}

function typeHintsFromDocs(docs: Map<string, Record<string, unknown>>): Record<string, unknown> {
  const hints: Record<string, unknown> = {};
  for (const data of docs.values()) {
    for (const fieldPath of inferFieldPaths([data])) {
      if (getPath(hints, fieldPath) !== undefined) {
        continue;
      }
      const value = getPath(data, fieldPath);
      if (value !== undefined) {
        setPath(hints, fieldPath.split("."), value);
      }
    }
  }
  return hints;
}

export function buildImportPlan(args: {
  rows: ExcelRow[];
  dbDocs: Map<string, Record<string, unknown>>;
  extraColumns: string[];
  mode: RecordUpdateMode;
  idColumn?: string;
}): PlannedChange[] {
  const extra = new Set(args.extraColumns);
  const excelIds = new Set<string>();
  const plan: PlannedChange[] = [];
  const seen = new Set<string>();
  const typeHints = typeHintsFromDocs(args.dbDocs);

  for (const row of args.rows) {
    const resolved = resolveRowDocId(row.cells, args.idColumn ?? DEFAULT_ID_COLUMN);
    if ("error" in resolved) {
      plan.push(errorChange({ rowNumber: row.number, docId: "" }, resolved.error));
      continue;
    }
    if (resolved.warning) {
      logger.warn(resolved.warning, { rowNumber: row.number });
    }
    if (seen.has(resolved.docId)) {
      plan.push(
        errorChange(
          { rowNumber: row.number, docId: resolved.docId },
          `Duplicate ${args.idColumn ?? DEFAULT_ID_COLUMN} in sheet`,
        ),
      );
      excelIds.add(resolved.docId);
      continue;
    }
    seen.add(resolved.docId);
    excelIds.add(resolved.docId);

    try {
      const existing = args.dbDocs.get(resolved.docId);
      const incoming = unflattenRow(
        Object.fromEntries(Object.entries(row.cells).filter(([key]) => !extra.has(key))),
        existing ?? typeHints,
      );
      const presentPaths = presentFieldPaths(row.cells, extra);
      plan.push(
        planRow({
          rowNumber: row.number,
          docId: resolved.docId,
          existing,
          incoming,
          presentPaths,
          mode: args.mode,
        }),
      );
    } catch (error) {
      const message =
        error instanceof PathCollisionError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to parse row";
      plan.push(errorChange({ rowNumber: row.number, docId: resolved.docId }, message));
    }
  }

  if (args.mode === "SYNC") {
    plan.push(...planSyncDeletes(args.dbDocs.keys(), excelIds));
  }

  return plan;
}
