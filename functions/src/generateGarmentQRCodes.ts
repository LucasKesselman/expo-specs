import admin from "firebase-admin";
import { logger } from "firebase-functions/logger";
import { onRequest } from "firebase-functions/v2/https";
import QRCode from "qrcode";

const REGION = "us-central1";
const QR_BUCKET_NAME = "qr-assets-bucket";
const QR_IMAGE_SIZE = 1200;
const QR_FILE_NAME = "code_1200x1200.png";
// TODO: Fix stale Cloud Run secret binding for this function before next deploy.
// Deploy error seen:
// "Could not create or update Cloud Run service generategarmentqrcodes. Accessing secret failed:
// Revision 'generategarmentqrcodes-00005-pib' is not ready and cannot serve traffic.
// spec.template.spec.containers[0].env[6].value_from.secret_key_ref.name:
// Failed to access secret projects/pygmalions-specs/secrets/QR_JOB_ADMIN_KEY/versions/1:
// Secret Version [projects/988189221716/secrets/QR_JOB_ADMIN_KEY/versions/1] is in DESTROYED state."

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const bucket = admin.storage().bucket(QR_BUCKET_NAME);
const GARMENTS_COLLECTION = "Garments";

const ensureGarmentQRFolderExists = async (garmentId: string) => {
  const folderPrefix = `Garments/${garmentId}/`;
  const [existingFiles] = await bucket.getFiles({ prefix: folderPrefix, maxResults: 1 });
  if (existingFiles.length > 0) {
    return;
  }

  // Cloud Storage is object-based; create a placeholder object so this path exists explicitly.
  await bucket.file(`${folderPrefix}.keep`).save("", {
    contentType: "text/plain",
    resumable: false,
    metadata: {
      cacheControl: "no-store",
    },
  });
};

interface GarmentQrGenerationResult {
  generatedCount: number;
  skippedCount: number;
  totalGarments: number;
  uniqueGarmentsProcessed: number;
}

function normalizeGarmentIdList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const uniqueIds = new Set<string>();
  for (const id of value) {
    if (typeof id !== "string") {
      continue;
    }

    const normalized = id.trim();
    if (normalized) {
      uniqueIds.add(normalized);
    }
  }

  return [...uniqueIds];
}

async function loadGarmentDocs(
  targetGarmentIds?: string[],
): Promise<Map<string, FirebaseFirestore.DocumentSnapshot>> {
  const garmentDocs = new Map<string, FirebaseFirestore.DocumentSnapshot>();

  if (targetGarmentIds && targetGarmentIds.length > 0) {
    const refs = targetGarmentIds.map((garmentId) => db.collection(GARMENTS_COLLECTION).doc(garmentId));
    const snapshots = await db.getAll(...refs);

    snapshots.forEach((snapshot, index) => {
      const garmentId = targetGarmentIds[index];
      if (!snapshot.exists) {
        throw new Error(`Garment does not exist for QR generation: ${garmentId}`);
      }

      garmentDocs.set(garmentId, snapshot);
    });

    return garmentDocs;
  }

  const garmentSnapshot = await db.collection(GARMENTS_COLLECTION).get();
  for (const garmentDoc of garmentSnapshot.docs) {
    const idFromDoc = garmentDoc.get("id");
    const garmentId =
      typeof idFromDoc === "string" && idFromDoc.trim().length > 0 ? idFromDoc.trim() : garmentDoc.id;
    if (!garmentDocs.has(garmentId)) {
      garmentDocs.set(garmentId, garmentDoc);
    }
  }

  return garmentDocs;
}

export async function generateGarmentQRCodesForGarments(
  targetGarmentIds?: string[],
): Promise<GarmentQrGenerationResult> {
  const garmentDocs = await loadGarmentDocs(targetGarmentIds);
  const totalGarments = targetGarmentIds?.length ?? garmentDocs.size;

  let generatedCount = 0;
  let skippedCount = 0;

  for (const [garmentId, garmentDoc] of garmentDocs.entries()) {
    const qrStatus = garmentDoc.get("qrCodeStatus");
    if (qrStatus === "GENERATED") {
      skippedCount += 1;
      continue;
    }

    const qrPayload = garmentId;
    const qrPng = await QRCode.toBuffer(qrPayload, {
      type: "png",
      errorCorrectionLevel: "L",
      margin: 0,
      width: QR_IMAGE_SIZE,
    });

    await ensureGarmentQRFolderExists(garmentId);

    const qrPath = `Garments/${garmentId}/${QR_FILE_NAME}`;
    await bucket.file(qrPath).save(qrPng, {
      contentType: "image/png",
      resumable: false,
      metadata: {
        cacheControl: "no-store",
      },
    });

    await garmentDoc.ref.set(
      {
        qrCodeStatus: "GENERATED",
      },
      { merge: true },
    );

    generatedCount += 1;
  }

  return {
    generatedCount,
    skippedCount,
    totalGarments,
    uniqueGarmentsProcessed: garmentDocs.size,
  };
}

export const generateGarmentQRCodes = onRequest(
  { region: REGION, invoker: "private" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed. Use POST.");
      return;
    }

    const targetGarmentIds = normalizeGarmentIdList((req.body as { garmentIds?: unknown })?.garmentIds);
    const result = await generateGarmentQRCodesForGarments(targetGarmentIds);

    logger.info("Garment QR generation complete", {
      generatedCount: result.generatedCount,
      skippedCount: result.skippedCount,
      totalGarments: result.totalGarments,
      uniqueGarmentsProcessed: result.uniqueGarmentsProcessed,
      targetMode: targetGarmentIds && targetGarmentIds.length > 0 ? "TARGETED" : "FULL_SCAN",
    });

    res.status(200).send(
      [
        `# garment QR codes generated: ${result.generatedCount}`,
        `# skipped due to preexisting QR codes: ${result.skippedCount}`,
        `total of # garments considered: ${result.totalGarments}`,
      ].join("\n")
    );
  }
);
