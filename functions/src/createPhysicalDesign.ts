import type { File } from "@google-cloud/storage";
import admin from "firebase-admin";
import { logger } from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const REGION = "us-central1";
const PHYSICAL_DESIGNS_COLLECTION = "PhysicalDesigns";
const MARKETPLACE_ASSETS_BUCKET = "marketplace-assets-bucket";
const AR_ASSETS_BUCKET = "ar-assets-bucket";

type MarketplaceStatus = "PUBLIC" | "PRIVATE";

interface CreatePhysicalDesignRequest {
  name: unknown;
  description: unknown;
  tags: unknown;
  priceAmount: unknown;
  marketplaceStatus: unknown;
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", `${fieldName} must be a string.`);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new HttpsError("invalid-argument", `${fieldName} is required.`);
  }

  return normalized;
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new HttpsError("invalid-argument", "tags must be an array of strings.");
  }

  const normalizedTags: string[] = [];
  for (const tag of value) {
    if (typeof tag !== "string") {
      throw new HttpsError("invalid-argument", "tags must be an array of strings.");
    }

    const normalizedTag = tag.trim();
    if (normalizedTag) {
      normalizedTags.push(normalizedTag);
    }
  }

  return normalizedTags;
}

function normalizePriceAmount(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new HttpsError(
      "invalid-argument",
      "priceAmount must be a non-negative integer representing USD cents.",
    );
  }

  return value;
}

function normalizeMarketplaceStatus(value: unknown): MarketplaceStatus {
  if (value !== "PUBLIC" && value !== "PRIVATE") {
    throw new HttpsError("invalid-argument", "marketplaceStatus must be PUBLIC or PRIVATE.");
  }

  return value;
}

async function createPlaceholderFile(bucketName: string, path: string): Promise<File> {
  const bucket = admin.storage().bucket(bucketName);
  const file = bucket.file(path);
  await file.save("", {
    contentType: "text/plain",
    resumable: false,
    metadata: {
      cacheControl: "no-store",
    },
  });
  return file;
}

async function assertSourceObjectExists(file: File, label: string): Promise<void> {
  const [exists] = await file.exists();
  if (!exists) {
    throw new HttpsError(
      "failed-precondition",
      `Missing staged asset: ${label}. Please re-upload assets and submit again.`,
    );
  }
}

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const createPhysicalDesign = onCall({ region: REGION }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be signed in to create a physical design.");
  }

  const requestData = request.data as CreatePhysicalDesignRequest;
  const name = normalizeRequiredString(requestData.name, "name");
  const description = normalizeRequiredString(requestData.description, "description");
  const tags = normalizeTags(requestData.tags);
  const priceAmount = normalizePriceAmount(requestData.priceAmount);
  const marketplaceStatus = normalizeMarketplaceStatus(requestData.marketplaceStatus);

  const authTokenName = request.auth?.token?.name;
  const authorFullName = typeof authTokenName === "string" ? authTokenName.trim() : "";

  const docRef = db.collection(PHYSICAL_DESIGNS_COLLECTION).doc();
  const designId = docRef.id;
  const now = admin.firestore.FieldValue.serverTimestamp();

  await docRef.set({
    id: designId,
    name,
    description,
    tags,
    priceAmount,
    marketplaceStatus,
    author: uid,
    authorFullName,
    savedCount: 0,
    purchaseCount: 0,
    createdAt: now,
    lastUpdatedAt: now,
    marketplaceThumbnailUrl: "",
    marketplaceFullImageUrl: "",
    marketplaceMiniImageURL: "",
    marketplaceThumbnailImageURL: "",
    marketplaceCardImageURL: "",
    marketplaceImageProcessingStatus: "PENDING_ORIGINAL_UPLOAD",
  });

  const cleanupFiles: File[] = [];
  try {
    const originalFolderPlaceholder = await createPlaceholderFile(
      MARKETPLACE_ASSETS_BUCKET,
      `${PHYSICAL_DESIGNS_COLLECTION}/${designId}/Original/.keep`,
    );
    cleanupFiles.push(originalFolderPlaceholder);

    const rawTargetsFolderPlaceholder = await createPlaceholderFile(
      AR_ASSETS_BUCKET,
      `${PHYSICAL_DESIGNS_COLLECTION}/${designId}/Targets/Raw/.keep`,
    );
    cleanupFiles.push(rawTargetsFolderPlaceholder);

    const stagingBucket = admin.storage().bucket();
    const stagingPrefix = `_temp/${uid}`;

    const originalSource = stagingBucket.file(`${stagingPrefix}/original.jpg`);
    const frontTargetSource = stagingBucket.file(`${stagingPrefix}/frontTargetImage.png`);
    const backTargetSource = stagingBucket.file(`${stagingPrefix}/backTargetImage.png`);

    await assertSourceObjectExists(originalSource, "original.jpg");
    await assertSourceObjectExists(frontTargetSource, "frontTargetImage.png");
    await assertSourceObjectExists(backTargetSource, "backTargetImage.png");

    const marketplaceBucket = admin.storage().bucket(MARKETPLACE_ASSETS_BUCKET);
    const arAssetsBucket = admin.storage().bucket(AR_ASSETS_BUCKET);

    const originalDestination = marketplaceBucket.file(
      `${PHYSICAL_DESIGNS_COLLECTION}/${designId}/Original/original.jpg`,
    );
    await originalSource.copy(originalDestination);
    cleanupFiles.push(originalDestination);

    const frontTargetDestination = arAssetsBucket.file(
      `${PHYSICAL_DESIGNS_COLLECTION}/${designId}/Targets/Raw/frontTargetImage.png`,
    );
    await frontTargetSource.copy(frontTargetDestination);
    cleanupFiles.push(frontTargetDestination);

    const backTargetDestination = arAssetsBucket.file(
      `${PHYSICAL_DESIGNS_COLLECTION}/${designId}/Targets/Raw/backTargetImage.png`,
    );
    await backTargetSource.copy(backTargetDestination);
    cleanupFiles.push(backTargetDestination);

    logger.info("Created physical design and promoted staged assets", {
      uid,
      designId,
      stagingPrefix,
    });

    return { designId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    logger.error("Failed to create physical design assets", {
      uid,
      designId,
      errorMessage,
    });

    for (const file of cleanupFiles.reverse()) {
      try {
        await file.delete({ ignoreNotFound: true });
      } catch (cleanupError) {
        const cleanupErrorMessage =
          cleanupError instanceof Error ? cleanupError.message : "Unknown cleanup error";
        logger.warn("Failed to clean up destination object after createPhysicalDesign failure", {
          uid,
          designId,
          path: file.name,
          errorMessage: cleanupErrorMessage,
        });
      }
    }

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      "internal",
      "Physical design record was created but asset promotion failed. Please retry.",
    );
  }
});
