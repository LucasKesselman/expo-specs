import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveUserPath } from "../src/config.js";
import { readImportWorkbook } from "../src/excel/reader.js";
import { writeExportWorkbook } from "../src/excel/writer.js";
import { buildExportFilename, buildReportFilename } from "../src/excel/filenames.js";
import { writeProcessingReport } from "../src/report/processingReport.js";

describe("resolveUserPath", () => {
  it("keeps absolute paths unchanged", () => {
    expect(resolveUserPath("/Users/johnbozzella/Downloads/export.csv")).toBe(
      "/Users/johnbozzella/Downloads/export.csv",
    );
  });

  it("expands ~ to the home directory instead of the tools folder", () => {
    expect(resolveUserPath("~/Downloads/export.csv")).toBe(
      path.join(os.homedir(), "Downloads/export.csv"),
    );
  });
});

describe("csv filenames", () => {
  it("includes collection, modes, and timestamp", () => {
    const date = new Date(2026, 7, 21, 16, 9, 0);
    expect(buildExportFilename("DigitalDesigns", date)).toBe(
      "artie-export-DigitalDesigns-20260821-160900.csv",
    );
    expect(buildReportFilename("Garments", "pretend", "UPDATE_ONLY", date)).toBe(
      "artie-processing-report-Garments-pretend-UPDATE_ONLY-20260821-160900.csv",
    );
  });
});

describe("csv write/read", () => {
  it("round-trips __docId, refs, tags, and nested fields as text", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "artie-bulk-tool-"));
    const filePath = path.join(dir, "export.csv");
    try {
      await writeExportWorkbook(filePath, [
        {
          docId: "g1",
          flat: {
            id: "g1",
            tags: 'json:["streetwear","limited"]',
            physicalDesign: "ref:PhysicalDesigns/abc123",
            "nested.size": "M",
            priceAmount: 1200,
            version: "1.0",
          },
        },
      ]);

      const parsed = await readImportWorkbook(filePath);
      expect(parsed.headers[0]).toBe("__docId");
      expect(parsed.rows).toHaveLength(1);
      expect(parsed.rows[0].cells.__docId).toBe("g1");
      expect(parsed.rows[0].cells.id).toBe("g1");
      expect(parsed.rows[0].cells.tags).toBe('json:["streetwear","limited"]');
      expect(parsed.rows[0].cells.physicalDesign).toBe("ref:PhysicalDesigns/abc123");
      expect(parsed.rows[0].cells["nested.size"]).toBe("M");
      expect(parsed.rows[0].cells.priceAmount).toBe("1200");
      expect(parsed.rows[0].cells.version).toBe("1.0");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("writes a processing report with run/summary/diff/error sections", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "artie-bulk-tool-"));
    try {
      const reportPath = await writeProcessingReport({
        outputDir: dir,
        collection: "DigitalDesigns",
        processingMode: "pretend",
        recordUpdateMode: "UPDATE_ONLY",
        columnCheckMode: "ALLOW_EXTRA",
        projectId: "pygmalions-specs",
        timestamp: new Date(2026, 7, 21, 16, 9, 0),
        plan: [
          {
            rowNumber: 2,
            docId: "d1",
            action: "UPDATE",
            diffs: [{ fieldPath: "name", oldValue: "Alpha", newValue: "Beta" }],
          },
          {
            rowNumber: 3,
            docId: "",
            action: "ERROR",
            diffs: [],
            error: "Missing __docId",
          },
        ],
      });

      expect(path.basename(reportPath)).toBe(
        "artie-processing-report-DigitalDesigns-pretend-UPDATE_ONLY-20260821-160900.csv",
      );

      const parsed = await readImportWorkbook(reportPath);
      expect(parsed.headers).toContain("section");
      expect(parsed.headers).toContain("key");
      const sections = parsed.rows.map((row) => String(row.cells.section));
      expect(sections).toContain("run");
      expect(sections).toContain("summary");
      expect(sections).toContain("diff");
      expect(sections).toContain("error");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
