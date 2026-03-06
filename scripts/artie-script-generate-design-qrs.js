#!/usr/bin/env node
/**
 * LK: Potential security issue – we should not use a service account key in the code.
 *
 * One-off script to generate QR code images for each file in Firebase Storage
 * designs/, and upload them to QRDesigns/. Reads designs/, writes QRDesigns/.
 *
 * Usage:
 *   npm run artie-script-generate-design-qrs [-- --dry-run] [-- --prefix=DES-]
 *
 * Options:
 *   --dry-run       List files under designs/ and print code + destination only; no upload.
 *   --prefix=PREFIX Prepend to design code (e.g. DES-). Output: QRDesigns/{prefix}{stem}.png
 *
 * Requires: Service account key. Either:
 *   - Set GOOGLE_APPLICATION_CREDENTIALS to the path to your JSON key, or
 *   - Place serviceAccountKey.json in this scripts/ folder (gitignored).
 *
 * Get the key: Firebase Console → Project settings → Service accounts →
 * Generate new private key.
 */

const path = require("path");
const admin = require("firebase-admin");
const QRCode = require("qrcode");

const STORAGE_BUCKET = "pygmalions-specs.firebasestorage.app";
const DESIGNS_PREFIX = "designs/";
const QR_DESIGNS_PREFIX = "QRdesigns/";

const OPTIONS_HELP = `
Options:
  --dry-run         List files and destination paths only; do not generate or upload.
  --prefix=PREFIX   Prepend to design code (e.g. --prefix=DES-). No prefix if omitted.

Examples:
  npm run artie-script-generate-design-qrs
  npm run artie-script-generate-design-qrs -- --dry-run
  npm run artie-script-generate-design-qrs -- --prefix=DES-
`;

function parseArgs() {
  const args = process.argv.slice(2);
  let dryRun = false;
  let prefix = "";

  for (const arg of args) {
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg.startsWith("--prefix=")) {
      prefix = arg.slice("--prefix=".length);
    } else if (arg === "--help" || arg === "-h") {
      console.log(OPTIONS_HELP.trim());
      process.exit(0);
    }
  }

  return { dryRun, prefix };
}

function initFirebase() {
  if (admin.apps.length > 0) return admin.storage().bucket(STORAGE_BUCKET);
  const keyPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(__dirname, "serviceAccountKey.json");
  try {
    const key = require(keyPath);
    admin.initializeApp({ credential: admin.credential.cert(key) });
  } catch (e) {
    console.error(
      "Firebase Admin init failed. Set GOOGLE_APPLICATION_CREDENTIALS or add scripts/serviceAccountKey.json (Firebase Console → Project settings → Service accounts → Generate new private key).",
    );
    process.exit(1);
  }
  return admin.storage().bucket(STORAGE_BUCKET);
}

/**
 * Derive design code from Storage file path: basename without extension.
 * e.g. designs/design_001.png -> design_001
 */
function deriveCode(fileName, prefix) {
  const base = path.basename(fileName);
  const stem = base.includes(".") ? base.replace(/\.[^.]*$/, "") : base;
  return prefix + stem;
}

/**
 * Skip directory-like placeholders (no extension, or trailing slash).
 */
function isRealFile(file) {
  const name = file.name;
  if (name.endsWith("/")) return false;
  const base = path.basename(name);
  return base.length > 0;
}

async function main() {
  const { dryRun, prefix } = parseArgs();

  const bucket = initFirebase();
  const [files] = await bucket.getFiles({ prefix: DESIGNS_PREFIX });

  const toProcess = files.filter(isRealFile);
  if (toProcess.length === 0) {
    console.log(`No files found under ${DESIGNS_PREFIX}. Exiting.`);
    process.exit(0);
  }

  if (dryRun) {
    console.log(
      `[dry-run] Found ${toProcess.length} file(s) under ${DESIGNS_PREFIX}:`,
    );
    for (const file of toProcess) {
      const code = deriveCode(file.name, prefix);
      const dest = `${QR_DESIGNS_PREFIX}${code}.png`;
      console.log(`  ${file.name} -> ${dest} (QR data: "${code}")`);
    }
    process.exit(0);
  }

  let failed = 0;
  for (const file of toProcess) {
    const code = deriveCode(file.name, prefix);
    const dest = `${QR_DESIGNS_PREFIX}${code}.png`;

    try {
      const buffer = await QRCode.toBuffer(code, {
        type: "png",
        width: 200,
        margin: 1,
      });
      await bucket.file(dest).save(buffer, { contentType: "image/png" });
      console.log(`OK: ${file.name} -> ${dest}`);
    } catch (err) {
      failed++;
      console.error(`FAIL: ${file.name} -> ${dest}:`, err.message);
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} upload(s) failed.`);
    process.exit(1);
  }

  console.log(
    `\nDone. Uploaded ${toProcess.length} QR code(s) to ${QR_DESIGNS_PREFIX}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
