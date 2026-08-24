import {
  isDocRef,
  isPlainObject,
  isRefPathValue,
  isTimestamp,
  toCsvToken,
} from "../mapping/codecs.js";
import { getPath } from "../mapping/flatten.js";
import type { FieldDiff } from "../types.js";

export function normalize(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }
  if (isTimestamp(value)) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (isDocRef(value)) {
    return `ref:${value.path}`;
  }
  if (isRefPathValue(value)) {
    return `ref:${value.__refPath}`;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item));
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = normalize(value[key]);
    }
    return out;
  }
  return value;
}

export function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (left === null || right === null) {
    return left === right;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, index) => deepEqual(item, right[index]));
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }
    return leftKeys.every((key) => deepEqual(left[key], right[key]));
  }
  return false;
}

export function diffFields(
  existing: Record<string, unknown> | undefined,
  incoming: Record<string, unknown>,
  presentPaths: string[],
): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  for (const fieldPath of presentPaths) {
    const oldValue = existing ? getPath(existing, fieldPath) : undefined;
    const newValue = getPath(incoming, fieldPath);
    if (toCsvToken(oldValue) === toCsvToken(newValue)) {
      continue;
    }
    if (!deepEqual(normalize(oldValue), normalize(newValue))) {
      diffs.push({ fieldPath, oldValue, newValue });
    }
  }
  return diffs;
}
