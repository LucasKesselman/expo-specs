export type ProcessingMode = "pretend" | "active";

export type RecordUpdateMode =
  | "UPDATE_ONLY"
  | "CREATE_ONLY"
  | "CREATE_AND_UPDATE"
  | "SYNC";

export type ColumnCheckMode =
  | "ALLOW_EXTRA"
  | "EXACT_MATCH"
  | "ALLOW_MISSING"
  | "ALLOW_EXTRA_AND_MISSING";

export type PlanAction = "CREATE" | "UPDATE" | "DELETE" | "SKIP" | "ERROR";

export interface FieldDiff {
  fieldPath: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface PlannedChange {
  rowNumber: number | null;
  docId: string;
  action: PlanAction;
  diffs: FieldDiff[];
  payload?: Record<string, unknown>;
  presentPaths?: string[];
  error?: string;
}

export interface ExcelRow {
  number: number;
  cells: Record<string, unknown>;
}

export interface ParsedWorkbook {
  headers: string[];
  rows: ExcelRow[];
}

export interface RefPathValue {
  __refPath: string;
}

export type FlatValue = string | number | boolean;
