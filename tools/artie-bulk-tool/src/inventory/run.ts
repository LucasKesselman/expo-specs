import type { Firestore } from "firebase-admin/firestore";
import { confirmYesNo } from "../confirm.js";
import { DEFAULT_OUTPUT_DIR, requireProcessingMode, resolveUserPath } from "../config.js";
import { initializeAdmin } from "../firebase/admin.js";
import { logger } from "../logging.js";
import { parseInventoryInput, type InventoryCliFlags, type ParsedInventoryInput } from "./input.js";
import {
  invokeGenerateInventoryGarments,
  type InventoryFunctionResponse,
} from "./invoke.js";
import { previewPhysicalDesign, type InventoryPreview } from "./preview.js";
import { writeInventoryReport } from "./report.js";

export interface GenerateInventoryCliOptions extends InventoryCliFlags {
  processingMode?: string;
  output?: string;
}

export interface GenerateInventoryRunDeps {
  initializeAdmin: () => { db: Firestore; projectId: string };
  previewPhysicalDesign: (db: Firestore, input: ParsedInventoryInput) => Promise<InventoryPreview>;
  invokeGenerateInventoryGarments: (input: ParsedInventoryInput) => Promise<InventoryFunctionResponse>;
  confirmYesNo: (message: string) => Promise<boolean>;
  writeInventoryReport: typeof writeInventoryReport;
}

const defaultDeps: GenerateInventoryRunDeps = {
  initializeAdmin,
  previewPhysicalDesign,
  invokeGenerateInventoryGarments,
  confirmYesNo,
  writeInventoryReport,
};

export async function runGenerateInventoryGarments(
  opts: GenerateInventoryCliOptions,
  deps: GenerateInventoryRunDeps = defaultDeps,
): Promise<void> {
  const processingMode = requireProcessingMode(opts.processingMode);
  const input = parseInventoryInput(opts);
  const outputDir = resolveUserPath(opts.output?.trim() || DEFAULT_OUTPUT_DIR);
  const timestamp = new Date();

  const { db, projectId } = deps.initializeAdmin();
  const preview = await deps.previewPhysicalDesign(db, input);

  logger.info("Inventory garment preview", {
    physicalDesignId: preview.physicalDesignId,
    quantity: preview.quantity,
    size: preview.size,
    version: preview.version,
    color: preview.color,
    processingMode,
  });

  if (processingMode === "pretend") {
    logger.info("Pretend mode: generateInventoryGarments will not be called.");
    const reportPath = await deps.writeInventoryReport({
      outputDir,
      processingMode,
      projectId,
      preview,
      timestamp,
    });
    logger.info(`Report written: ${reportPath}`);
    return;
  }

  const confirmed = await deps.confirmYesNo(activeConfirmMessage(preview));
  if (!confirmed) {
    const reportPath = await deps.writeInventoryReport({
      outputDir,
      processingMode,
      projectId,
      preview,
      cancelled: true,
      timestamp,
    });
    logger.warn("Active inventory run cancelled; generateInventoryGarments was not called.");
    logger.info(`Report written: ${reportPath}`);
    process.exitCode = 1;
    return;
  }

  try {
    logger.info("Calling generateInventoryGarments...");
    const result = await deps.invokeGenerateInventoryGarments(input);
    const reportPath = await deps.writeInventoryReport({
      outputDir,
      processingMode,
      projectId,
      preview,
      result,
      timestamp,
    });
    logger.info("Inventory garments created.", {
      garmentCount: result.garmentCount,
      qrGeneratedCount: result.qrGeneration.generatedCount,
      qrSkippedCount: result.qrGeneration.skippedCount,
    });
    logger.info(`Report written: ${reportPath}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const reportPath = await deps.writeInventoryReport({
      outputDir,
      processingMode,
      projectId,
      preview,
      error: errorMessage,
      timestamp,
    });
    logger.error(errorMessage);
    logger.info(`Report written: ${reportPath}`);
    process.exitCode = 1;
  }
}

export function activeConfirmMessage(preview: InventoryPreview): string {
  return `⚠️ This will create ${preview.quantity} Garments for PhysicalDesign ${preview.physicalDesignId} (version ${preview.version}, size ${preview.size}) and generate QR codes. Proceed? (y/n)`;
}
