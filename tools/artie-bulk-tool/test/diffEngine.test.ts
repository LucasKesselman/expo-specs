import { describe, expect, it } from "vitest";
import { diffFields } from "../src/import/diffEngine.js";
import { planRow, planSyncDeletes } from "../src/import/planBuilder.js";

const existing = {
  id: "d1",
  name: "Alpha",
  tags: ["streetwear"],
  priceAmount: 1200,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("diffEngine", () => {
  it("reports only fields that actually changed", () => {
    const incoming = { ...existing, name: "Beta", tags: ["streetwear", "limited"] };
    const diffs = diffFields(existing, incoming, ["id", "name", "tags", "priceAmount"]);
    expect(diffs.map((diff) => diff.fieldPath).sort()).toEqual(["name", "tags"]);
  });

  it("treats Timestamp-like values and Dates as equal when ISO matches", () => {
    const date = new Date("2026-08-21T16:09:00.000Z");
    const timestamp = {
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0,
      toDate: () => date,
    };
    expect(
      diffFields({ createdAt: timestamp }, { createdAt: date }, ["createdAt"]),
    ).toEqual([]);
  });

  it("does not treat version 1.0 as a change to 1", () => {
    expect(
      diffFields({ version: "1.0" }, { version: "1.0" }, ["version"]),
    ).toEqual([]);
    expect(
      diffFields({ version: "1.0" }, { version: 1 }, ["version"]).map((diff) => diff.fieldPath),
    ).toEqual(["version"]);
  });
});

describe("planRow", () => {
  it("UPDATE_ONLY updates on diffs, skips identical, errors when missing", () => {
    expect(
      planRow({
        rowNumber: 2,
        docId: "d1",
        existing,
        incoming: { ...existing, name: "Beta" },
        presentPaths: ["name"],
        mode: "UPDATE_ONLY",
      }).action,
    ).toBe("UPDATE");

    expect(
      planRow({
        rowNumber: 3,
        docId: "d1",
        existing,
        incoming: existing,
        presentPaths: ["name"],
        mode: "UPDATE_ONLY",
      }).action,
    ).toBe("SKIP");

    expect(
      planRow({
        rowNumber: 4,
        docId: "missing",
        incoming: { name: "New" },
        presentPaths: ["name"],
        mode: "UPDATE_ONLY",
      }).action,
    ).toBe("ERROR");
  });

  it("CREATE_ONLY creates when missing and errors when the id exists", () => {
    expect(
      planRow({
        rowNumber: 2,
        docId: "new",
        incoming: { name: "New" },
        presentPaths: ["name"],
        mode: "CREATE_ONLY",
      }).action,
    ).toBe("CREATE");

    expect(
      planRow({
        rowNumber: 3,
        docId: "d1",
        existing,
        incoming: { name: "Alpha" },
        presentPaths: ["name"],
        mode: "CREATE_ONLY",
      }).action,
    ).toBe("ERROR");
  });

  it("CREATE_AND_UPDATE upserts", () => {
    expect(
      planRow({
        rowNumber: 2,
        docId: "new",
        incoming: { name: "New" },
        presentPaths: ["name"],
        mode: "CREATE_AND_UPDATE",
      }).action,
    ).toBe("CREATE");

    expect(
      planRow({
        rowNumber: 3,
        docId: "d1",
        existing,
        incoming: { ...existing, name: "Beta" },
        presentPaths: ["name"],
        mode: "CREATE_AND_UPDATE",
      }).action,
    ).toBe("UPDATE");
  });

  it("errors when an update tries to change createdAt", () => {
    const result = planRow({
      rowNumber: 2,
      docId: "d1",
      existing,
      incoming: { ...existing, createdAt: new Date("2026-08-21T00:00:00.000Z") },
      presentPaths: ["createdAt"],
      mode: "UPDATE_ONLY",
    });
    expect(result.action).toBe("ERROR");
    expect(result.error).toMatch(/createdAt is immutable/);
  });

  it("ignores lastUpdatedAt when deciding whether to update", () => {
    const result = planRow({
      rowNumber: 2,
      docId: "d1",
      existing,
      incoming: { ...existing, lastUpdatedAt: new Date() },
      presentPaths: ["name", "lastUpdatedAt"],
      mode: "UPDATE_ONLY",
    });
    expect(result.action).toBe("SKIP");
  });
});

describe("planSyncDeletes", () => {
  it("deletes Firestore ids that are missing from the sheet", () => {
    const deletes = planSyncDeletes(["a", "b", "c"], new Set(["a", "c"]));
    expect(deletes).toEqual([
      { rowNumber: null, docId: "b", action: "DELETE", diffs: [] },
    ]);
  });
});
