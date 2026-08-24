import { encodeValue, isPlainObject } from "./codecs.js";
import type { FlatValue } from "../types.js";

export class PathCollisionError extends Error {
  constructor(public readonly path: string) {
    super(`Path collision at ${path}`);
    this.name = "PathCollisionError";
  }
}

export function getPath(obj: unknown, path: string): unknown {
  const segments = path.split(".").filter(Boolean);
  let current: unknown = obj;
  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function setPath(target: Record<string, unknown>, segments: string[], value: unknown): void {
  if (segments.length === 0) {
    throw new Error("Cannot set an empty path.");
  }

  let current: Record<string, unknown> = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const key = segments[index];
    const prefix = segments.slice(0, index + 1).join(".");
    if (!(key in current) || current[key] === undefined) {
      current[key] = {};
    } else if (!isPlainObject(current[key])) {
      throw new PathCollisionError(prefix);
    }
    current = current[key] as Record<string, unknown>;
  }

  const last = segments[segments.length - 1];
  const fullPath = segments.join(".");
  if (last in current && current[last] !== undefined) {
    const existing = current[last];
    if (isPlainObject(existing) && !isPlainObject(value)) {
      throw new PathCollisionError(fullPath);
    }
    if (!isPlainObject(existing) && isPlainObject(value)) {
      throw new PathCollisionError(fullPath);
    }
  }
  current[last] = value;
}

export function flattenDoc(
  data: Record<string, unknown>,
  prefix = "",
): Record<string, FlatValue> {
  const out: Record<string, FlatValue> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }
    const path = prefix ? `${prefix}.${key}` : key;
    const encoded = encodeValue(value);
    if (typeof encoded === "object" && encoded !== null && "__nested" in encoded) {
      Object.assign(out, flattenDoc(encoded.__nested, path));
    } else {
      out[path] = encoded;
    }
  }
  return out;
}
