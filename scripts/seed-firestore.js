#!/usr/bin/env node
/**
 *
 *
 * LK: This is a potnetial securuty issue, we should not be using a service account key in the code.
 *
 *
 * One-off script to generate fake Designs and Garments in Firestore.
 * For demos/meetings. Uses Firebase Admin SDK (bypasses security rules).
 *
 * Usage:
 *   npm run artie-script-generate-fake-data -- --designs=10 --garments=3
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
const { faker } = require("@faker-js/faker");

const DESIGNS_COLLECTION = "Designs";
const GARMENTS_COLLECTION = "Garments";

const PRODUCT_CATEGORIES = [
  "tees",
  "hoodies",
  "accessories",
  "limited-edition",
  "bestseller",
  "new",
];

const GARMENT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const GARMENT_COLORS = [
  "White",
  "Black",
  "Navy",
  "Heather Grey",
  "Olive",
  "Sand",
  "Burgundy",
  "Forest Green",
];

const OPTIONS_HELP = `
Supported options (provide at least one; N must be a whole number >= 1):

  --designs=N    Generate N documents in the Designs collection
  --garments=N   Generate N documents in the Garments collection

Examples:
  npm run artie-script-generate-fake-data -- --designs=10
  npm run artie-script-generate-fake-data -- --garments=3
  npm run artie-script-generate-fake-data -- --designs=10 --garments=3
`;

function parsePositiveInt(value, optionName) {
  const trimmed = String(value).trim();
  if (trimmed === "" || /[^\d]/.test(trimmed)) return null; // decimal, negative, or non-numeric
  const n = parseInt(trimmed, 10);
  return n >= 1 ? n : null;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const hasDesignsOption = args.some((a) => a.startsWith("--designs="));
  const hasGarmentsOption = args.some((a) => a.startsWith("--garments="));

  if (!hasDesignsOption && !hasGarmentsOption) {
    console.error(OPTIONS_HELP.trim());
    process.exit(1);
  }

  let designs = 0;
  let garments = 0;

  for (const arg of args) {
    if (arg.startsWith("--designs=")) {
      const raw = arg.slice("--designs=".length);
      const n = parsePositiveInt(raw, "designs");
      if (n === null) {
        console.error(`Error: --designs must be a whole number >= 1 (got "${raw}").`);
        process.exit(1);
      }
      designs = n;
    } else if (arg.startsWith("--garments=")) {
      const raw = arg.slice("--garments=".length);
      const n = parsePositiveInt(raw, "garments");
      if (n === null) {
        console.error(`Error: --garments must be a whole number >= 1 (got "${raw}").`);
        process.exit(1);
      }
      garments = n;
    }
  }

  return { designs, garments };
}

function pickCategories(count = 2) {
  const shuffled = [...PRODUCT_CATEGORIES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function initFirebase() {
  if (admin.apps.length > 0) return admin.firestore();
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
  return admin.firestore();
}

const BATCH_SIZE = 400;

async function seedDesigns(db, count) {
  const ids = [];
  for (let off = 0; off < count; off += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = Math.min(BATCH_SIZE, count - off);
    for (let i = 0; i < chunk; i++) {
      const ref = db.collection(DESIGNS_COLLECTION).doc();
      const id = ref.id;
      ids.push(id);
      const doc = {
        id,
        name: faker.commerce.productName(),
        author: faker.company.name(),
        created: new Date().toISOString(),
        categories: pickCategories(1 + ((off + i) % 2)),
        image: `https://picsum.photos/seed/design-${id}/400/400`,
        description: faker.commerce.productDescription(),
        price: "$0.00",
        priceAmount: 0,
        sku: `DES-${id.slice(0, 8).toUpperCase()}`,
        tags: ["seed", "demo"],
        active: true,
      };
      batch.set(ref, doc);
    }
    await batch.commit();
  }
  return ids;
}

async function seedGarments(db, count) {
  const ids = [];
  for (let off = 0; off < count; off += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = Math.min(BATCH_SIZE, count - off);
    for (let i = 0; i < chunk; i++) {
      const ref = db.collection(GARMENTS_COLLECTION).doc();
      const id = ref.id;
      ids.push(id);
      const sizeCount = 3 + ((off + i) % 3);
      const sizes = GARMENT_SIZES.slice(0, sizeCount);
      const doc = {
        id,
        name: faker.commerce.productName(),
        sizes,
        color: GARMENT_COLORS[(off + i) % GARMENT_COLORS.length],
        sku: `GAR-${id.slice(0, 8).toUpperCase()}`,
        author: faker.company.name(),
        releaseYear: [2023, 2024][(off + i) % 2],
        categories: pickCategories(1 + ((off + i) % 2)),
        image: `https://picsum.photos/seed/garment-${id}/400/400`,
        description: faker.commerce.productDescription(),
        price: "$24.99",
        active: true,
      };
      batch.set(ref, doc);
    }
    await batch.commit();
  }
  return ids;
}

async function main() {
  const { designs, garments } = parseArgs();
  const parts = [];
  if (designs > 0) parts.push(`${designs} designs`);
  if (garments > 0) parts.push(`${garments} garments`);
  console.log(`Generating ${parts.join(" and ")}...`);
  const db = initFirebase();
  const [designIds, garmentIds] = await Promise.all([
    designs > 0 ? seedDesigns(db, designs) : Promise.resolve([]),
    garments > 0 ? seedGarments(db, garments) : Promise.resolve([]),
  ]);
  console.log(
    `Done. Created ${designIds.length} designs and ${garmentIds.length} garments directly in Firebase Firestore.`,
  );
  console.log(`\nCollections: "${DESIGNS_COLLECTION}", "${GARMENTS_COLLECTION}"`);
  if (designIds.length) {
    console.log(`\nDesign IDs (${DESIGNS_COLLECTION}):\n  ${designIds.join("\n  ")}`);
  }
  if (garmentIds.length) {
    console.log(`\nGarment IDs (${GARMENTS_COLLECTION}):\n  ${garmentIds.join("\n  ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
