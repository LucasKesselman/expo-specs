import { describe, expect, it } from "vitest";
import { flattenDoc, getPath, PathCollisionError } from "../src/mapping/flatten.js";
import { unflattenRow } from "../src/mapping/unflatten.js";

const iso = "2026-08-21T16:09:00.000Z";

function fakeRef(path: string): { path: string; id: string; get: () => Promise<unknown> } {
  return {
    path,
    id: path.split("/")[1] ?? path,
    get: async () => undefined,
  };
}

describe("flatten / unflatten", () => {
  it("flattens nested maps with dot notation", () => {
    expect(flattenDoc({ a: { b: 1, c: { d: "x" } } })).toEqual({
      "a.b": 1,
      "a.c.d": "x",
    });
  });

  it("JSON-encodes tags and garment DocumentReferences", () => {
    const flat = flattenDoc({
      id: "g1",
      tags: ["streetwear", "limited"],
      physicalDesign: fakeRef("PhysicalDesigns/abc123"),
      digitalDesign: fakeRef("DigitalDesigns/des456"),
      createdAt: {
        seconds: Math.floor(new Date(iso).getTime() / 1000),
        nanoseconds: 0,
        toDate: () => new Date(iso),
      },
    });

    expect(flat.id).toBe("g1");
    expect(flat.tags).toBe('json:["streetwear","limited"]');
    expect(flat.physicalDesign).toBe("ref:PhysicalDesigns/abc123");
    expect(flat.digitalDesign).toBe("ref:DigitalDesigns/des456");
    expect(flat.createdAt).toBe(`ts:${iso}`);
  });

  it("round-trips a garment-like row", () => {
    const incoming = unflattenRow({
      __docId: "g1",
      id: "g1",
      tags: 'json:["streetwear","limited"]',
      physicalDesign: "ref:PhysicalDesigns/abc123",
      "nested.size": "M",
      createdAt: `ts:${iso}`,
    });

    expect(incoming).toEqual({
      id: "g1",
      tags: ["streetwear", "limited"],
      physicalDesign: { __refPath: "PhysicalDesigns/abc123" },
      nested: { size: "M" },
      createdAt: new Date(iso),
    });
    expect(getPath(incoming, "nested.size")).toBe("M");
  });

  it("omits blank cells on unflatten", () => {
    expect(unflattenRow({ name: "A", description: "" })).toEqual({ name: "A" });
  });

  it("throws on path collisions", () => {
    expect(() => unflattenRow({ tags: "json:[\"a\"]", "tags.0": "b" })).toThrow(PathCollisionError);
  });

  it("does not coerce version 1.0 to the number 1", () => {
    expect(unflattenRow({ version: "1.0", priceAmount: "0" }, { version: "1.0", priceAmount: 0 })).toEqual({
      version: "1.0",
      priceAmount: 0,
    });
  });
});
