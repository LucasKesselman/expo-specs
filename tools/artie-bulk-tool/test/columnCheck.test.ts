import { describe, expect, it } from "vitest";
import { checkColumns, ColumnCheckError } from "../src/import/columnCheck.js";

const dbFieldPaths = ["id", "name", "tags", "priceAmount"];

describe("columnCheck", () => {
  it("ALLOW_EXTRA ignores extra columns and fails on missing DB fields", () => {
    expect(
      checkColumns({
        excelHeaders: ["__docId", "id", "name", "tags", "priceAmount", "notes"],
        dbFieldPaths,
        mode: "ALLOW_EXTRA",
      }),
    ).toEqual({ extra: ["notes"], missing: [] });

    expect(() =>
      checkColumns({
        excelHeaders: ["__docId", "id", "name"],
        dbFieldPaths,
        mode: "ALLOW_EXTRA",
      }),
    ).toThrow(ColumnCheckError);
  });

  it("EXACT_MATCH forbids extra and missing columns", () => {
    expect(
      checkColumns({
        excelHeaders: ["__docId", "id", "name", "tags", "priceAmount"],
        dbFieldPaths,
        mode: "EXACT_MATCH",
      }),
    ).toEqual({ extra: [], missing: [] });

    expect(() =>
      checkColumns({
        excelHeaders: ["__docId", "id", "name", "tags", "priceAmount", "notes"],
        dbFieldPaths,
        mode: "EXACT_MATCH",
      }),
    ).toThrow(/Extra columns/);

    expect(() =>
      checkColumns({
        excelHeaders: ["__docId", "id", "name"],
        dbFieldPaths,
        mode: "EXACT_MATCH",
      }),
    ).toThrow(/Missing columns/);
  });

  it("ALLOW_MISSING allows omitted DB fields and fails on extra columns", () => {
    expect(
      checkColumns({
        excelHeaders: ["__docId", "id", "name"],
        dbFieldPaths,
        mode: "ALLOW_MISSING",
      }),
    ).toEqual({ extra: [], missing: ["priceAmount", "tags"] });

    expect(() =>
      checkColumns({
        excelHeaders: ["__docId", "id", "name", "notes"],
        dbFieldPaths,
        mode: "ALLOW_MISSING",
      }),
    ).toThrow(ColumnCheckError);
  });

  it("ALLOW_EXTRA_AND_MISSING allows both extra and missing", () => {
    expect(
      checkColumns({
        excelHeaders: ["__docId", "name", "notes"],
        dbFieldPaths,
        mode: "ALLOW_EXTRA_AND_MISSING",
      }),
    ).toEqual({ extra: ["notes"], missing: ["id", "priceAmount", "tags"] });
  });
});
