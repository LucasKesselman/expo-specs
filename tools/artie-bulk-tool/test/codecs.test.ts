import { describe, expect, it } from "vitest";
import { decodeCsvValue, decodeValue, encodeValue, PREFIX } from "../src/mapping/codecs.js";

const iso = "2026-08-21T16:09:00.000Z";

describe("codecs", () => {
  it("round-trips timestamps", () => {
    const encoded = encodeValue(new Date(iso));
    expect(encoded).toBe(`${PREFIX.ts}${iso}`);
    expect(decodeValue(encoded)).toEqual(new Date(iso));
  });

  it("encodes duck-typed Firestore Timestamps", () => {
    const date = new Date(iso);
    const timestamp = {
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0,
      toDate: () => date,
    };
    expect(encodeValue(timestamp)).toBe(`${PREFIX.ts}${iso}`);
  });

  it("round-trips document references", () => {
    const encoded = encodeValue({
      path: "PhysicalDesigns/abc123",
      id: "abc123",
      get: async () => undefined,
    });
    expect(encoded).toBe(`${PREFIX.ref}PhysicalDesigns/abc123`);
    expect(decodeValue(encoded)).toEqual({ __refPath: "PhysicalDesigns/abc123" });
  });

  it("round-trips tags arrays as json", () => {
    const encoded = encodeValue(["streetwear", "limited"]);
    expect(encoded).toBe(`${PREFIX.json}${JSON.stringify(["streetwear", "limited"])}`);
    expect(decodeValue(encoded)).toEqual(["streetwear", "limited"]);
  });

  it("encodes null and empty string with tokens", () => {
    expect(encodeValue(null)).toBe(PREFIX.null);
    expect(decodeValue(PREFIX.null)).toBeNull();
    expect(encodeValue("")).toBe(PREFIX.empty);
    expect(decodeValue(PREFIX.empty)).toBe("");
  });

  it("leaves primitives unchanged", () => {
    expect(encodeValue(42)).toBe(42);
    expect(encodeValue(true)).toBe(true);
    expect(encodeValue("hello")).toBe("hello");
    expect(decodeValue(42)).toBe(42);
  });

  it("keeps CSV version tokens like 1.0 as strings", () => {
    expect(decodeCsvValue("1.0", "1.0")).toBe("1.0");
    expect(decodeCsvValue("1", "1")).toBe("1");
    expect(decodeCsvValue("2.0")).toBe("2.0");
  });

  it("preserves Firestore number types for numeric CSV cells", () => {
    expect(decodeCsvValue("0", 0)).toBe(0);
    expect(decodeCsvValue("70000", 99)).toBe(70000);
    expect(decodeCsvValue("99", 99)).toBe(99);
  });
});
