import type { RefPathValue } from "../types.js";

export const PREFIX = {
  ts: "ts:",
  ref: "ref:",
  json: "json:",
  null: "null:",
  empty: "empty:",
} as const;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function isTimestamp(value: unknown): value is { toDate: () => Date; seconds: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toDate?: unknown }).toDate === "function" &&
    typeof (value as { seconds?: unknown }).seconds === "number"
  );
}

export function isDocRef(value: unknown): value is { path: string; id: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as { path?: unknown; id?: unknown; get?: unknown };
  return (
    typeof candidate.path === "string" &&
    candidate.path.includes("/") &&
    typeof candidate.id === "string" &&
    typeof candidate.get === "function"
  );
}

export function isRefPathValue(value: unknown): value is RefPathValue {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { __refPath?: unknown }).__refPath === "string"
  );
}

export function isGeoPoint(value: unknown): value is { latitude: number; longitude: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { latitude?: unknown }).latitude === "number" &&
    typeof (value as { longitude?: unknown }).longitude === "number" &&
    typeof (value as { isEqual?: unknown }).isEqual === "function"
  );
}

export function encodeValue(value: unknown): string | number | boolean | { __nested: Record<string, unknown> } {
  if (value === null) {
    return `${PREFIX.null}`;
  }
  if (value === "") {
    return `${PREFIX.empty}`;
  }
  if (value instanceof Date) {
    return `${PREFIX.ts}${value.toISOString()}`;
  }
  if (isTimestamp(value)) {
    return `${PREFIX.ts}${value.toDate().toISOString()}`;
  }
  if (isDocRef(value)) {
    return `${PREFIX.ref}${value.path}`;
  }
  if (isRefPathValue(value)) {
    return `${PREFIX.ref}${value.__refPath}`;
  }
  if (isGeoPoint(value)) {
    return `${PREFIX.json}${JSON.stringify({ latitude: value.latitude, longitude: value.longitude })}`;
  }
  if (Array.isArray(value)) {
    return `${PREFIX.json}${JSON.stringify(value)}`;
  }
  if (isPlainObject(value)) {
    return { __nested: value };
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return `${PREFIX.json}${JSON.stringify(value)}`;
}

export function decodeValue(raw: unknown): unknown {
  if (raw === "" || raw === undefined) {
    return undefined;
  }
  if (typeof raw !== "string") {
    return raw;
  }
  if (raw === PREFIX.null) {
    return null;
  }
  if (raw === PREFIX.empty) {
    return "";
  }
  if (raw.startsWith(PREFIX.ts)) {
    const iso = raw.slice(PREFIX.ts.length);
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid timestamp value: ${raw}`);
    }
    return date;
  }
  if (raw.startsWith(PREFIX.ref)) {
    const refPath = raw.slice(PREFIX.ref.length).trim();
    if (!refPath) {
      throw new Error("Empty document reference path.");
    }
    return { __refPath: refPath } satisfies RefPathValue;
  }
  if (raw.startsWith(PREFIX.json)) {
    return JSON.parse(raw.slice(PREFIX.json.length)) as unknown;
  }
  return raw;
}

export function toCsvToken(value: unknown): string {
  if (value === undefined) {
    return "";
  }
  const encoded = encodeValue(value);
  if (typeof encoded === "object" && encoded !== null && "__nested" in encoded) {
    return JSON.stringify(encoded.__nested);
  }
  if (typeof encoded === "boolean") {
    return encoded ? "true" : "false";
  }
  return String(encoded);
}

export function decodeCsvValue(raw: unknown, existing?: unknown): unknown {
  if (raw === "" || raw === undefined || raw === null) {
    return undefined;
  }
  const token = typeof raw === "string" ? raw : String(raw);
  const decoded = decodeValue(token);
  if (decoded !== token) {
    return decoded;
  }
  if (typeof existing === "boolean") {
    if (token === "true") {
      return true;
    }
    if (token === "false") {
      return false;
    }
  }
  if (typeof existing === "number") {
    const numeric = Number(token);
    if (token.trim() !== "" && Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return token;
}

export function formatDisplayValue(value: unknown): string {
  if (value === undefined) {
    return "";
  }
  const encoded = encodeValue(value);
  if (typeof encoded === "object" && encoded !== null && "__nested" in encoded) {
    return JSON.stringify(encoded.__nested);
  }
  return String(encoded);
}
