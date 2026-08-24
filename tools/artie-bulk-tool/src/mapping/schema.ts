import { flattenDoc } from "./flatten.js";

export function inferFieldPaths(docs: Record<string, unknown>[]): string[] {
  const paths = new Set<string>();
  for (const doc of docs) {
    for (const key of Object.keys(flattenDoc(doc))) {
      paths.add(key);
    }
  }
  return [...paths].sort();
}
