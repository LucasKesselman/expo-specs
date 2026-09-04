import { afterEach, describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
import {
  INVENTORY_FUNCTION_AUDIENCE_ENV,
  INVENTORY_FUNCTION_URL_ENV,
  invokeGenerateInventoryGarments,
  resolveInventoryFunctionConfig,
  toInventoryFunctionBody,
  type InventoryFunctionResponse,
  type InventoryRequestFn,
} from "../src/inventory/invoke.js";
import type { InventoryPreview } from "../src/inventory/preview.js";
import { activeConfirmMessage, runGenerateInventoryGarments } from "../src/inventory/run.js";
import type { GenerateInventoryRunDeps } from "../src/inventory/run.js";

const FUNCTION_URL = "https://generateinventorygarments-example-uc.a.run.app";

const preview: InventoryPreview = {
  physicalDesignId: "abc123",
  designNumber: "2601G",
  version: "2601G00",
  color: "BLACK",
  quantity: 50,
  size: "L",
  backprintVersion: "00",
};

const successResult: InventoryFunctionResponse = {
  garmentCount: 2,
  garmentIds: ["g1", "g2"],
  qrGeneration: {
    generatedCount: 2,
    skippedCount: 0,
    totalGarments: 2,
    uniqueGarmentsProcessed: 2,
  },
};

afterEach(() => {
  process.exitCode = undefined;
  vi.restoreAllMocks();
});

describe("resolveInventoryFunctionConfig", () => {
  it("requires GENERATE_INVENTORY_GARMENTS_URL", () => {
    expect(() => resolveInventoryFunctionConfig({})).toThrow(/GENERATE_INVENTORY_GARMENTS_URL is not set/);
  });

  it("uses the Cloud Run URL as the token audience by default", () => {
    expect(
      resolveInventoryFunctionConfig({
        [INVENTORY_FUNCTION_URL_ENV]: FUNCTION_URL,
      }),
    ).toEqual({ url: FUNCTION_URL, audience: FUNCTION_URL });
  });

  it("allows a separate audience", () => {
    expect(
      resolveInventoryFunctionConfig({
        [INVENTORY_FUNCTION_URL_ENV]: FUNCTION_URL,
        [INVENTORY_FUNCTION_AUDIENCE_ENV]: "https://other.example",
      }),
    ).toEqual({ url: FUNCTION_URL, audience: "https://other.example" });
  });
});

describe("invokeGenerateInventoryGarments", () => {
  it("POSTs explicit quantity and size to the configured URL", async () => {
    const requestFn: InventoryRequestFn = vi.fn(async (args) => {
      expect(args).toEqual({
        url: FUNCTION_URL,
        audience: FUNCTION_URL,
        body: {
          physicalDesignId: "abc123",
          quantity: 50,
          size: "L",
          backprintVersion: "00",
        },
      });
      return successResult;
    });

    const result = await invokeGenerateInventoryGarments(
      {
        physicalDesignId: "abc123",
        quantity: 50,
        size: "L",
        backprintVersion: "00",
      },
      requestFn,
      { [INVENTORY_FUNCTION_URL_ENV]: FUNCTION_URL },
    );

    expect(result).toEqual(successResult);
    expect(requestFn).toHaveBeenCalledTimes(1);
  });
});

describe("toInventoryFunctionBody", () => {
  it("sends resolved quantity and size, not quantitySize", () => {
    expect(
      toInventoryFunctionBody({
        physicalDesignId: "abc123",
        quantity: 3,
        size: "S",
        backprintVersion: "00",
      }),
    ).toEqual({
      physicalDesignId: "abc123",
      quantity: 3,
      size: "S",
      backprintVersion: "00",
    });
  });
});

function mockDeps(overrides: Partial<GenerateInventoryRunDeps> = {}): GenerateInventoryRunDeps & {
  invoke: ReturnType<typeof vi.fn>;
  confirm: ReturnType<typeof vi.fn>;
} {
  const invoke = vi.fn(async () => successResult);
  const confirm = vi.fn(async () => true);
  return {
    initializeAdmin: () => ({ db: {} as Firestore, projectId: "pygmalions-specs" }),
    previewPhysicalDesign: vi.fn(async () => preview),
    invokeGenerateInventoryGarments: invoke,
    confirmYesNo: confirm,
    writeInventoryReport: vi.fn(async () => "/tmp/report.csv"),
    invoke,
    confirm,
    ...overrides,
  };
}

describe("runGenerateInventoryGarments", () => {
  const flags = {
    physicalDesignId: "abc123",
    quantity: "50",
    size: "L",
    backprintVersion: "00",
    output: "/tmp",
  };

  it("pretend mode previews and never POSTs", async () => {
    const deps = mockDeps();
    await runGenerateInventoryGarments({ ...flags, processingMode: "pretend" }, deps);

    expect(deps.previewPhysicalDesign).toHaveBeenCalledTimes(1);
    expect(deps.invoke).not.toHaveBeenCalled();
    expect(deps.confirm).not.toHaveBeenCalled();
    expect(deps.writeInventoryReport).toHaveBeenCalledWith(
      expect.objectContaining({
        processingMode: "pretend",
        preview,
      }),
    );
    const reportArg = vi.mocked(deps.writeInventoryReport).mock.calls[0][0];
    expect(reportArg.result).toBeUndefined();
    expect(reportArg.cancelled).toBeUndefined();
    expect(process.exitCode).toBeUndefined();
  });

  it("active mode confirms and POSTs the expected body", async () => {
    const deps = mockDeps();
    await runGenerateInventoryGarments({ ...flags, processingMode: "active" }, deps);

    expect(deps.confirm).toHaveBeenCalledWith(activeConfirmMessage(preview));
    expect(deps.invoke).toHaveBeenCalledWith({
      physicalDesignId: "abc123",
      quantity: 50,
      size: "L",
      backprintVersion: "00",
    });
    expect(deps.writeInventoryReport).toHaveBeenCalledWith(
      expect.objectContaining({
        processingMode: "active",
        result: successResult,
      }),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it("active mode cancel skips the HTTP call", async () => {
    const deps = mockDeps({
      confirmYesNo: vi.fn(async () => false),
    });
    await runGenerateInventoryGarments({ ...flags, processingMode: "active" }, deps);

    expect(deps.invokeGenerateInventoryGarments).not.toHaveBeenCalled();
    expect(deps.writeInventoryReport).toHaveBeenCalledWith(
      expect.objectContaining({ cancelled: true }),
    );
    expect(process.exitCode).toBe(1);
  });
});
