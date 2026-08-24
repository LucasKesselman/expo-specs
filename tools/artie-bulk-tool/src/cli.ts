import path from "node:path";
import { Command, Option } from "commander";
import { confirmTyped, confirmYesNo } from "./confirm.js";
import {
  ALLOWED_COLLECTIONS,
  COLUMN_CHECK_MODES,
  DEFAULT_ID_COLUMN,
  DEFAULT_OUTPUT_DIR,
  PROCESSING_MODES,
  RECORD_UPDATE_MODES,
  requireProcessingMode,
  resolveUserPath,
  SYNC_WARNING,
} from "./config.js";
import { writeExportWorkbook } from "./excel/writer.js";
import { buildExportFilename } from "./excel/filenames.js";
import { readImportWorkbook } from "./excel/reader.js";
import { initializeAdmin } from "./firebase/admin.js";
import {
  assertTopLevelCollection,
  CollectionNotAllowedError,
  isAllowedCollection,
} from "./firebase/collections.js";
import { loadCollectionMap } from "./firebase/firestoreService.js";
import { applyPlan } from "./import/applyPlan.js";
import { checkColumns, ColumnCheckError } from "./import/columnCheck.js";
import { buildImportPlan } from "./import/planBuilder.js";
import { logger } from "./logging.js";
import { flattenDoc } from "./mapping/flatten.js";
import { inferFieldPaths } from "./mapping/schema.js";
import { writeProcessingReport } from "./report/processingReport.js";
import type { ColumnCheckMode, ProcessingMode, RecordUpdateMode } from "./types.js";

interface CollectionGateOptions {
  collection: string;
  allowUnlistedCollection?: boolean;
}

async function ensureCollectionAllowed(opts: CollectionGateOptions): Promise<void> {
  assertTopLevelCollection(opts.collection);
  if (isAllowedCollection(opts.collection)) {
    return;
  }
  if (!opts.allowUnlistedCollection) {
    throw new CollectionNotAllowedError(opts.collection);
  }
  const confirmed = await confirmTyped(
    `Collection "${opts.collection}" is not in the allowlist (${ALLOWED_COLLECTIONS.join(", ")}). Type the collection name to proceed:`,
    opts.collection,
  );
  if (!confirmed) {
    throw new Error(`Aborted: collection "${opts.collection}" was not confirmed.`);
  }
}

async function runExport(opts: {
  collection: string;
  output: string;
  allowUnlistedCollection?: boolean;
}): Promise<void> {
  await ensureCollectionAllowed(opts);
  const { db, projectId } = initializeAdmin();
  logger.info(`Exporting ${opts.collection} from ${projectId}...`);

  const docs = await loadCollectionMap(db, opts.collection);
  const rows = [...docs.entries()].map(([docId, data]) => ({
    docId,
    flat: flattenDoc(data),
  }));

  const outputDir = resolveUserPath(opts.output);
  const filePath = path.join(outputDir, buildExportFilename(opts.collection));
  await writeExportWorkbook(filePath, rows);
  logger.info(`Wrote ${rows.length} documents to ${filePath}`);
}

async function runImport(opts: {
  collection: string;
  input: string;
  recordUpdateMode: RecordUpdateMode;
  processingMode?: ProcessingMode;
  columnCheckMode: ColumnCheckMode;
  idColumn: string;
  output: string;
  schemaSampleSize?: number;
  allowUnlistedCollection?: boolean;
}): Promise<void> {
  const processingMode = requireProcessingMode(opts.processingMode);
  await ensureCollectionAllowed(opts);
  const { db, projectId } = initializeAdmin();
  const outputDir = resolveUserPath(opts.output);
  const timestamp = new Date();

  const inputPath = resolveUserPath(opts.input);
  logger.info(`Importing ${inputPath} into ${opts.collection} (${projectId}).`, {
    processingMode,
    recordUpdateMode: opts.recordUpdateMode,
    columnCheckMode: opts.columnCheckMode,
  });

  const dbDocs = await loadCollectionMap(db, opts.collection);
  const sampleDocs =
    typeof opts.schemaSampleSize === "number" && Number.isFinite(opts.schemaSampleSize)
      ? [...dbDocs.values()].slice(0, Math.max(0, opts.schemaSampleSize))
      : [...dbDocs.values()];
  const dbFieldPaths = inferFieldPaths(sampleDocs);
  const sheet = await readImportWorkbook(inputPath);

  let extra: string[] = [];
  try {
    extra = checkColumns({
      excelHeaders: sheet.headers,
      dbFieldPaths,
      mode: opts.columnCheckMode,
    }).extra;
  } catch (error) {
    if (error instanceof ColumnCheckError) {
      const reportPath = await writeProcessingReport({
        outputDir,
        collection: opts.collection,
        processingMode,
        recordUpdateMode: opts.recordUpdateMode,
        columnCheckMode: opts.columnCheckMode,
        projectId,
        plan: [],
        columnCheckError: { extra: error.extra, missing: error.missing, mode: error.mode },
        timestamp,
      });
      logger.error(error.message);
      logger.info(`Report written: ${reportPath}`);
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  const plan = buildImportPlan({
    rows: sheet.rows,
    dbDocs,
    extraColumns: extra,
    mode: opts.recordUpdateMode,
    idColumn: opts.idColumn,
  });
  const planCounts = {
    creates: plan.filter((change) => change.action === "CREATE").length,
    updates: plan.filter((change) => change.action === "UPDATE").length,
    deletes: plan.filter((change) => change.action === "DELETE").length,
    skips: plan.filter((change) => change.action === "SKIP").length,
    errors: plan.filter((change) => change.action === "ERROR").length,
  };
  logger.info("Import plan built.", planCounts);

  if (opts.recordUpdateMode === "SYNC" && processingMode === "active") {
    const ok = await confirmYesNo(SYNC_WARNING);
    if (!ok) {
      const reportPath = await writeProcessingReport({
        outputDir,
        collection: opts.collection,
        processingMode,
        recordUpdateMode: opts.recordUpdateMode,
        columnCheckMode: opts.columnCheckMode,
        projectId,
        plan,
        cancelled: true,
        timestamp,
      });
      logger.warn("SYNC active run cancelled; no Firestore writes were applied.");
      logger.info(`Report written: ${reportPath}`);
      process.exitCode = 1;
      return;
    }
  }

  if (processingMode === "active") {
    logger.info("Applying writes to Firestore...");
    await applyPlan(db, opts.collection, plan);
    logger.info("Firestore writes finished.");
  } else {
    logger.info("Pretend mode: no Firestore writes will be applied.");
  }

  const reportPath = await writeProcessingReport({
    outputDir,
    collection: opts.collection,
    processingMode,
    recordUpdateMode: opts.recordUpdateMode,
    columnCheckMode: opts.columnCheckMode,
    projectId,
    plan,
    timestamp,
  });
  logger.info(`Report written: ${reportPath}`);

  if (plan.some((change) => change.action === "ERROR")) {
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("artieBulkTool")
    .description("Internal Firestore Excel export/import CLI (Firebase Admin SDK).")
    .showHelpAfterError();

  program
    .command("export")
    .description("Export a Firestore collection to a timestamped .csv file")
    .requiredOption("--collection <name>", "Top-level Firestore collection id")
    .option("--output <dir>", "Directory for the export file", DEFAULT_OUTPUT_DIR)
    .option("--allowUnlistedCollection", "Allow a collection outside the v1 allowlist")
    .action(async (opts: { collection: string; output: string; allowUnlistedCollection?: boolean }) => {
      await runExport(opts);
    });

  program
    .command("import")
    .description("Import an Excel sheet into a Firestore collection")
    .requiredOption("--collection <name>", "Top-level Firestore collection id")
    .requiredOption("--input <path>", "Path to the input .csv file")
    .addOption(
      new Option("--recordUpdateMode <mode>", "How rows map to existing documents")
        .choices(RECORD_UPDATE_MODES)
        .makeOptionMandatory(),
    )
    .addOption(
      new Option("--processingMode <mode>", "Dry-run or write to Firestore")
        .choices(PROCESSING_MODES)
        .makeOptionMandatory(),
    )
    .addOption(
      new Option("--columnCheckMode <mode>", "How Excel headers must relate to DB fields")
        .choices(COLUMN_CHECK_MODES)
        .makeOptionMandatory(),
    )
    .option("--idColumn <name>", "Column used as the Firestore document id", DEFAULT_ID_COLUMN)
    .option("--output <dir>", "Directory for the processing report", DEFAULT_OUTPUT_DIR)
    .option(
      "--schemaSampleSize <n>",
      "Limit docs used to infer DB columns (default: all)",
      (value: string) => Number.parseInt(value, 10),
    )
    .option("--allowUnlistedCollection", "Allow a collection outside the v1 allowlist")
    .action(
      async (opts: {
        collection: string;
        input: string;
        recordUpdateMode: RecordUpdateMode;
        processingMode: ProcessingMode;
        columnCheckMode: ColumnCheckMode;
        idColumn: string;
        output: string;
        schemaSampleSize?: number;
        allowUnlistedCollection?: boolean;
      }) => {
        await runImport(opts);
      },
    );

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(message);
  process.exit(1);
});
