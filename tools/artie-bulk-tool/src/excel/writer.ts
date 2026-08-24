import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_ID_COLUMN } from "../config.js";
import type { FlatValue } from "../types.js";

export interface ExportRow {
  docId: string;
  flat: Record<string, FlatValue>;
}

function csvCell(value: string | number | boolean): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return `"${String(value).replaceAll('"', '""')}"`;
}

export async function writeCsvFile(
  filePath: string,
  headers: string[],
  rows: Array<Array<string | number | boolean>>,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const lines = [
    headers.map((header) => csvCell(header)).join(","),
    ...rows.map((row) => row.map((cell) => csvCell(cell)).join(",")),
  ];
  await writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
}

export async function writeExportWorkbook(filePath: string, rows: ExportRow[]): Promise<void> {
  const headerSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row.flat)) {
      headerSet.add(key);
    }
  }
  const headers = [DEFAULT_ID_COLUMN, ...[...headerSet].sort()];
  const csvRows = rows.map((row) =>
    headers.map((header) => {
      if (header === DEFAULT_ID_COLUMN) {
        return row.docId;
      }
      const value = row.flat[header];
      return value === undefined ? "" : value;
    }),
  );
  await writeCsvFile(filePath, headers, csvRows);
}
