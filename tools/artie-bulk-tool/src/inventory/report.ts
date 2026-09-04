import path from "node:path";
import { writeCsvFile } from "../excel/writer.js";
import { buildInventoryReportFilename } from "../excel/filenames.js";
import type { ProcessingMode } from "../types.js";
import type { InventoryPreview } from "./preview.js";
import type { InventoryFunctionResponse } from "./invoke.js";

export interface InventoryReportInput {
  outputDir: string;
  processingMode: ProcessingMode;
  projectId: string;
  preview: InventoryPreview;
  result?: InventoryFunctionResponse;
  cancelled?: boolean;
  error?: string;
  timestamp?: Date;
}

const REPORT_HEADERS = ["section", "key", "value", "garmentId", "error"] as const;

function reportRow(fields: {
  section: string;
  key?: string;
  value?: string | number | boolean;
  garmentId?: string;
  error?: string;
}): Array<string | number | boolean> {
  return [
    fields.section,
    fields.key ?? "",
    fields.value ?? "",
    fields.garmentId ?? "",
    fields.error ?? "",
  ];
}

export async function writeInventoryReport(input: InventoryReportInput): Promise<string> {
  const timestamp = input.timestamp ?? new Date();
  const filePath = path.resolve(
    input.outputDir,
    buildInventoryReportFilename(input.processingMode, timestamp),
  );

  const rows: Array<Array<string | number | boolean>> = [];
  const runRows: Array<[string, string | number | boolean]> = [
    ["projectId", input.projectId],
    ["processingMode", input.processingMode],
    ["physicalDesignId", input.preview.physicalDesignId],
    ["designNumber", input.preview.designNumber],
    ["version", input.preview.version],
    ["color", input.preview.color],
    ["quantity", input.preview.quantity],
    ["size", input.preview.size],
    ["backprintVersion", input.preview.backprintVersion],
    ["timestamp", timestamp.toISOString()],
    ["cancelled", Boolean(input.cancelled)],
  ];
  for (const [key, value] of runRows) {
    rows.push(reportRow({ section: "run", key, value }));
  }

  const garmentCount = input.result?.garmentCount ?? (input.processingMode === "pretend" ? input.preview.quantity : 0);
  rows.push(reportRow({ section: "summary", key: "garmentCount", value: garmentCount }));
  if (input.result) {
    rows.push(
      reportRow({
        section: "summary",
        key: "qrGeneratedCount",
        value: input.result.qrGeneration.generatedCount,
      }),
      reportRow({
        section: "summary",
        key: "qrSkippedCount",
        value: input.result.qrGeneration.skippedCount,
      }),
      reportRow({
        section: "summary",
        key: "qrTotalGarments",
        value: input.result.qrGeneration.totalGarments,
      }),
    );
  }

  if (input.result) {
    for (const garmentId of input.result.garmentIds) {
      rows.push(reportRow({ section: "garment", garmentId }));
    }
  }

  if (input.error) {
    rows.push(reportRow({ section: "error", error: input.error }));
  }

  await writeCsvFile(filePath, [...REPORT_HEADERS], rows);
  return filePath;
}
