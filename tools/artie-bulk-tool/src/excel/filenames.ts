export function formatRunTimestamp(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function buildExportFilename(collection: string, date = new Date()): string {
  return `artie-export-${collection}-${formatRunTimestamp(date)}.csv`;
}

export function buildReportFilename(
  collection: string,
  processingMode: string,
  recordUpdateMode: string,
  date = new Date(),
): string {
  return `artie-processing-report-${collection}-${processingMode}-${recordUpdateMode}-${formatRunTimestamp(date)}.csv`;
}

export function buildInventoryReportFilename(processingMode: string, date = new Date()): string {
  return `artie-inventory-garments-${processingMode}-${formatRunTimestamp(date)}.csv`;
}
