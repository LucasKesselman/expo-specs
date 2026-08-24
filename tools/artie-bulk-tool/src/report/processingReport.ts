import { mkdir } from "node:fs/promises";
import path from "node:path";
import { writeCsvFile } from "../excel/writer.js";
import { buildReportFilename } from "../excel/filenames.js";
import { formatDisplayValue } from "../mapping/codecs.js";
import type {
  ColumnCheckMode,
  PlannedChange,
  ProcessingMode,
  RecordUpdateMode,
} from "../types.js";

export interface ReportInput {
  outputDir: string;
  collection: string;
  processingMode: ProcessingMode;
  recordUpdateMode: RecordUpdateMode;
  columnCheckMode?: ColumnCheckMode;
  projectId: string;
  plan: PlannedChange[];
  cancelled?: boolean;
  columnCheckError?: { extra: string[]; missing: string[]; mode: string };
  timestamp?: Date;
}

function countByAction(plan: PlannedChange[]): Record<string, number> {
  const counts = {
    CREATE: 0,
    UPDATE: 0,
    DELETE: 0,
    SKIP: 0,
    ERROR: 0,
  };
  for (const change of plan) {
    counts[change.action] += 1;
  }
  return counts;
}

const REPORT_HEADERS = [
  "section",
  "rowNumber",
  "__docId",
  "action",
  "fieldChangeCount",
  "fieldPath",
  "oldValue",
  "newValue",
  "error",
  "key",
  "value",
] as const;

function reportRow(fields: {
  section: string;
  rowNumber?: number | string;
  docId?: string;
  action?: string;
  fieldChangeCount?: number | string;
  fieldPath?: string;
  oldValue?: string;
  newValue?: string;
  error?: string;
  key?: string;
  value?: string | number | boolean;
}): Array<string | number | boolean> {
  return [
    fields.section,
    fields.rowNumber ?? "",
    fields.docId ?? "",
    fields.action ?? "",
    fields.fieldChangeCount ?? "",
    fields.fieldPath ?? "",
    fields.oldValue ?? "",
    fields.newValue ?? "",
    fields.error ?? "",
    fields.key ?? "",
    fields.value ?? "",
  ];
}

export async function writeProcessingReport(input: ReportInput): Promise<string> {
  const timestamp = input.timestamp ?? new Date();
  const filename = buildReportFilename(
    input.collection,
    input.processingMode,
    input.recordUpdateMode,
    timestamp,
  );
  const filePath = path.resolve(input.outputDir, filename);
  await mkdir(path.dirname(filePath), { recursive: true });

  const counts = countByAction(input.plan);
  const rows: Array<Array<string | number | boolean>> = [];

  const runRows: Array<[string, string | number | boolean]> = [
    ["collection", input.collection],
    ["projectId", input.projectId],
    ["processingMode", input.processingMode],
    ["recordUpdateMode", input.recordUpdateMode],
    ["columnCheckMode", input.columnCheckMode ?? ""],
    ["timestamp", timestamp.toISOString()],
    ["cancelled", Boolean(input.cancelled)],
    ["created", counts.CREATE],
    ["updated", counts.UPDATE],
    ["deleted", counts.DELETE],
    ["skipped", counts.SKIP],
    ["errored", counts.ERROR],
  ];
  if (input.columnCheckError) {
    runRows.push(
      ["columnCheckFailed", true],
      ["extraColumns", input.columnCheckError.extra.join(", ")],
      ["missingColumns", input.columnCheckError.missing.join(", ")],
    );
  }
  for (const [key, value] of runRows) {
    rows.push(reportRow({ section: "run", key, value }));
  }

  for (const change of input.plan) {
    rows.push(
      reportRow({
        section: "summary",
        rowNumber: change.rowNumber ?? "",
        docId: change.docId,
        action: change.action,
        fieldChangeCount: change.diffs.length,
        error: change.error ?? "",
      }),
    );
  }

  for (const change of input.plan) {
    for (const diff of change.diffs) {
      rows.push(
        reportRow({
          section: "diff",
          rowNumber: change.rowNumber ?? "",
          docId: change.docId,
          action: change.action,
          fieldPath: diff.fieldPath,
          oldValue: formatDisplayValue(diff.oldValue),
          newValue: formatDisplayValue(diff.newValue),
        }),
      );
    }
  }

  if (input.columnCheckError) {
    rows.push(
      reportRow({
        section: "error",
        action: "ERROR",
        error: `Column check failed (${input.columnCheckError.mode}). Extra: ${input.columnCheckError.extra.join(", ") || "(none)"}. Missing: ${input.columnCheckError.missing.join(", ") || "(none)"}.`,
      }),
    );
  }
  for (const change of input.plan) {
    if (change.action === "ERROR" || change.error) {
      rows.push(
        reportRow({
          section: "error",
          rowNumber: change.rowNumber ?? "",
          docId: change.docId,
          action: change.action,
          error: change.error ?? "",
        }),
      );
    }
  }

  await writeCsvFile(filePath, [...REPORT_HEADERS], rows);
  return filePath;
}
