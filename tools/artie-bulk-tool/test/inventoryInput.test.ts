import { describe, expect, it } from "vitest";
import {
  MAX_QUANTITY,
  parseInventoryInput,
  parseQuantitySize,
  resolveQuantityAndSize,
} from "../src/inventory/input.js";

describe("parseQuantitySize", () => {
  it('parses "50, L"', () => {
    expect(parseQuantitySize("50, L")).toEqual({ quantity: 50, size: "L" });
  });

  it("allows extra spaces and lowercase size", () => {
    expect(parseQuantitySize("3,  s")).toEqual({ quantity: 3, size: "S" });
  });

  it("rejects malformed strings", () => {
    expect(() => parseQuantitySize("50 L")).toThrow(/quantitySize must look like/);
    expect(() => parseQuantitySize("L, 50")).toThrow(/quantitySize must look like/);
    expect(() => parseQuantitySize("")).toThrow(/quantitySize is required/);
  });
});

describe("resolveQuantityAndSize", () => {
  it("uses explicit quantity and size", () => {
    expect(resolveQuantityAndSize({ quantity: 12, size: "XL" })).toEqual({
      quantity: 12,
      size: "XL",
    });
  });

  it("accepts quantity as a numeric string", () => {
    expect(resolveQuantityAndSize({ quantity: "8", size: "m" })).toEqual({
      quantity: 8,
      size: "M",
    });
  });

  it("prefers explicit quantity and size over quantitySize", () => {
    expect(
      resolveQuantityAndSize({
        quantity: 2,
        size: "S",
        quantitySize: "50, L",
      }),
    ).toEqual({ quantity: 2, size: "S" });
  });

  it("uses quantitySize when quantity and size are omitted", () => {
    expect(resolveQuantityAndSize({ quantitySize: "50, L" })).toEqual({
      quantity: 50,
      size: "L",
    });
  });

  it("requires both quantity and size when either is present", () => {
    expect(() => resolveQuantityAndSize({ quantity: 10 })).toThrow(
      /Provide both quantity and size/,
    );
    expect(() => resolveQuantityAndSize({ size: "L" })).toThrow(
      /Provide both quantity and size/,
    );
  });

  it("requires quantity/size or quantitySize", () => {
    expect(() => resolveQuantityAndSize({})).toThrow(/Provide quantity and size/);
  });
});

describe("parseInventoryInput", () => {
  it("parses required flags with quantity and size", () => {
    expect(
      parseInventoryInput({
        physicalDesignId: " abc123 ",
        quantity: "50",
        size: "L",
        backprintVersion: "00",
      }),
    ).toEqual({
      physicalDesignId: "abc123",
      quantity: 50,
      size: "L",
      backprintVersion: "00",
    });
  });

  it("parses quantitySize", () => {
    expect(
      parseInventoryInput({
        physicalDesignId: "abc123",
        quantitySize: "4, XXL",
        backprintVersion: "01",
      }),
    ).toEqual({
      physicalDesignId: "abc123",
      quantity: 4,
      size: "XXL",
      backprintVersion: "01",
    });
  });

  it("requires physicalDesignId and backprintVersion", () => {
    expect(() =>
      parseInventoryInput({
        quantity: 1,
        size: "S",
        backprintVersion: "00",
      }),
    ).toThrow(/physicalDesignId must be a string/);

    expect(() =>
      parseInventoryInput({
        physicalDesignId: "abc",
        quantity: 1,
        size: "S",
      }),
    ).toThrow(/backprintVersion must be a string/);
  });

  it("rejects invalid size", () => {
    expect(() =>
      parseInventoryInput({
        physicalDesignId: "abc",
        quantity: 1,
        size: "BIG",
        backprintVersion: "00",
      }),
    ).toThrow(/size must be one of/);
  });

  it("rejects non-integer and non-positive quantity", () => {
    expect(() =>
      parseInventoryInput({
        physicalDesignId: "abc",
        quantity: "50.5",
        size: "L",
        backprintVersion: "00",
      }),
    ).toThrow(/quantity must be a positive integer/);

    expect(() =>
      parseInventoryInput({
        physicalDesignId: "abc",
        quantity: 0,
        size: "L",
        backprintVersion: "00",
      }),
    ).toThrow(/quantity must be a positive integer/);
  });

  it(`rejects quantity above ${MAX_QUANTITY}`, () => {
    expect(() =>
      parseInventoryInput({
        physicalDesignId: "abc",
        quantity: MAX_QUANTITY + 1,
        size: "L",
        backprintVersion: "00",
      }),
    ).toThrow(`quantity must be at most ${MAX_QUANTITY}.`);
  });
});
