export function firstValidImageUrl(candidates: unknown[]): string | null {
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}
