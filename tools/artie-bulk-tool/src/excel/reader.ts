import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import type { ParsedWorkbook } from "../types.js";

export async function readImportWorkbook(filePath: string): Promise<ParsedWorkbook> {
  const text = await readFile(filePath, "utf8");
  const records = parse(text, {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: false,
    relax_quotes: true,
    cast: false,
    trim: false,
  }) as string[][];

  if (records.length === 0) {
    throw new Error("CSV file is missing a header row.");
  }

  const headerRecord = records[0] ?? [];
  const headers: string[] = [];
  const seen = new Set<string>();
  for (const raw of headerRecord) {
    const header = raw.trim();
    if (header) {
      if (seen.has(header)) {
        throw new Error(`Duplicate CSV header "${header}".`);
      }
      seen.add(header);
    }
    headers.push(header);
  }

  if (!headers.some((header) => header.length > 0)) {
    throw new Error("CSV file is missing a header row.");
  }

  const rows: ParsedWorkbook["rows"] = [];
  for (let index = 1; index < records.length; index += 1) {
    const record = records[index] ?? [];
    const cells: Record<string, unknown> = {};
    let hasValue = false;
    for (let column = 0; column < headers.length; column += 1) {
      const header = headers[column];
      if (!header) {
        continue;
      }
      const raw = record[column] ?? "";
      cells[header] = raw;
      if (raw !== "") {
        hasValue = true;
      }
    }
    if (!hasValue) {
      continue;
    }
    rows.push({ number: index + 1, cells });
  }

  return {
    headers: headers.filter((header) => header.length > 0),
    rows,
  };
}
