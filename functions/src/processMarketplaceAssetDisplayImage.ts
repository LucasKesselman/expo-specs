import admin from "firebase-admin";
import type { File } from "@google-cloud/storage";
import { randomUUID } from "crypto";
import { logger } from "firebase-functions/logger";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import sharp from "sharp";

const REGION = "us-central1";
const MARKETPLACE_ASSETS_BUCKET = "marketplace-assets-bucket";
const FUNCTION_NAME = "processMarketplaceAssetDisplayImage";
const SOURCE_PATH_PATTERN =
  /^(DigitalDesigns|PhysicalDesigns)\/([^/]+)\/Original\/original\.[^/.]+$/i;

const STATUS = {
  ORIGINAL_UPLOADED: "ORIGINAL_UPLOADED",
  PROCESSING: "PROCESSING",
  DERIVATIVES_GENERATED: "DERIVATIVES_GENERATED",
  DERIVATIVES_FAILED: "DERIVATIVES_FAILED",
} as const;

const DERIVATIVES = [
  {
    key: "mini",
    fileName: "mini_128x128.webp",
    width: 128,
    height: 128,
    format: "webp" as const,
    contentType: "image/webp",
    quality: 82,
  },
  {
    key: "thumbnail",
    fileName: "thumbnail_360x640.webp",
    width: 360,
    height: 640,
    format: "webp" as const,
    contentType: "image/webp",
    quality: 84,
  },
  {
    key: "card",
    fileName: "card_720x1280.webp",
    width: 720,
    height: 1280,
    format: "webp" as const,
    contentType: "image/webp",
    quality: 86,
  },
  {
    key: "detail",
    fileName: "detail_1440x2560.jpg",
    width: 1440,
    height: 2560,
    format: "jpeg" as const,
    contentType: "image/jpeg",
    quality: 88,
  },
] as const;

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface ParsedObjectPath {
  collectionName: "DigitalDesigns" | "PhysicalDesigns";
  designId: string;
  sourcePath: string;
  basePrefix: string;
}

function parseObjectPath(path: string | undefined): ParsedObjectPath | null {
  if (!path) {
    return null;
  }

  const match = path.match(SOURCE_PATH_PATTERN);
  if (!match) {
    return null;
  }

  const collectionName = match[1] as "DigitalDesigns" | "PhysicalDesigns";
  const designId = match[2];
  return {
    collectionName,
    designId,
    sourcePath: path,
    basePrefix: `${collectionName}/${designId}`,
  };
}

function derivativeOutputBuffer(
  sourceBuffer: Buffer,
  derivative: (typeof DERIVATIVES)[number],
): Promise<Buffer> {
  const pipeline = sharp(sourceBuffer).rotate().resize(derivative.width, derivative.height, {
    fit: "cover",
    position: "attention",
    withoutEnlargement: false,
  });

  if (derivative.format === "webp") {
    return pipeline.webp({ quality: derivative.quality }).toBuffer();
  }

  return pipeline.jpeg({ quality: derivative.quality, mozjpeg: true }).toBuffer();
}

function buildFirebaseDownloadUrl(bucketName: string, objectPath: string, token: string): string {
  const encodedObjectPath = encodeURIComponent(objectPath);
  const encodedToken = encodeURIComponent(token);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedObjectPath}?alt=media&token=${encodedToken}`;
}

async function setOriginalMetadataStatus(
  file: File,
  status: string,
  generation: string,
  extraMetadata?: Record<string, string>,
): Promise<void> {
  const [currentMetadata] = await file.getMetadata();
  const currentCustomMetadata = currentMetadata.metadata ?? {};

  await file.setMetadata({
    metadata: {
      ...currentCustomMetadata,
      marketplaceAssetProcessingStatus: status,
      marketplaceAssetSourceGeneration: generation,
      marketplaceAssetStatusUpdatedAt: new Date().toISOString(),
      marketplaceAssetProcessedBy: FUNCTION_NAME,
      ...extraMetadata,
    },
  });
}

export const processMarketplaceAssetDisplayImage = onObjectFinalized(
  { region: REGION, bucket: MARKETPLACE_ASSETS_BUCKET },
  async (event) => {
    const object = event.data;
    const path = object.name;
    const bucketName = object.bucket || MARKETPLACE_ASSETS_BUCKET;
    const contentType = object.contentType ?? "";
    const generation = object.generation ? String(object.generation) : "";

    const parsed = parseObjectPath(path);
    if (!parsed) {
      return;
    }

    if (!contentType.startsWith("image/")) {
      logger.warn("Skipping non-image source object", { path, contentType, bucketName });
      return;
    }

    if (!generation) {
      logger.warn("Skipping source object with missing generation", { path, bucketName });
      return;
    }

    const bucket = admin.storage().bucket(bucketName);
    const sourceFile = bucket.file(parsed.sourcePath);
    const docRef = db.collection(parsed.collectionName).doc(parsed.designId);
    const now = admin.firestore.FieldValue.serverTimestamp();

    const derivativeBasePath = `${parsed.basePrefix}/Derivatives`;

    try {
      const [docSnapshot] = await Promise.all([docRef.get()]);
      if (!docSnapshot.exists) {
        logger.error("Source design document not found", {
          path: parsed.sourcePath,
          collectionName: parsed.collectionName,
          designId: parsed.designId,
          generation,
        });
        await Promise.all([
          setOriginalMetadataStatus(sourceFile, STATUS.DERIVATIVES_FAILED, generation, {
            marketplaceAssetProcessingError: "Source design document not found",
          }),
          docRef.set(
            {
              marketplaceImageProcessingStatus: "PROCESSING_FAILURE",
            },
            { merge: true },
          ),
        ]);
        return;
      }
      const existingData = docSnapshot.data() ?? {};
      const existingMarketplaceStatus =
        typeof existingData.marketplaceStatus === "string" &&
        existingData.marketplaceStatus.trim().length > 0
          ? existingData.marketplaceStatus.trim()
          : "PUBLIC";

      await setOriginalMetadataStatus(sourceFile, STATUS.PROCESSING, generation);

      const [sourceBuffer] = await sourceFile.download();
      const derivativePathMap: Record<string, string> = {};
      const derivativeTokenMap: Record<string, string> = {};

      for (const derivative of DERIVATIVES) {
        const output = await derivativeOutputBuffer(sourceBuffer, derivative);
        const derivativePath = `${derivativeBasePath}/${derivative.fileName}`;
        const downloadToken = randomUUID();
        derivativePathMap[derivative.key] = derivativePath;
        derivativeTokenMap[derivative.key] = downloadToken;

        await bucket.file(derivativePath).save(output, {
          contentType: derivative.contentType,
          resumable: false,
          metadata: {
            cacheControl: "public, max-age=31536000, immutable",
            metadata: {
              marketplaceAssetDerivativeKey: derivative.key,
              marketplaceAssetSourcePath: parsed.sourcePath,
              marketplaceAssetSourceGeneration: generation,
              marketplaceAssetCreatedBy: FUNCTION_NAME,
              firebaseStorageDownloadTokens: downloadToken,
            },
          },
        });
      }

      const formattedThumbnailUrl = buildFirebaseDownloadUrl(
        bucketName,
        derivativePathMap.thumbnail,
        derivativeTokenMap.thumbnail,
      );
      const formattedMiniImageUrl = buildFirebaseDownloadUrl(
        bucketName,
        derivativePathMap.mini,
        derivativeTokenMap.mini,
      );
      const formattedCardImageUrl = buildFirebaseDownloadUrl(
        bucketName,
        derivativePathMap.card,
        derivativeTokenMap.card,
      );

      await Promise.all([
        setOriginalMetadataStatus(sourceFile, STATUS.DERIVATIVES_GENERATED, generation, {
          marketplaceAssetProcessingError: "",
          marketplaceAssetDerivativesPathPrefix: derivativeBasePath,
        }),
        docRef.set(
          {
            marketplaceStatus: existingMarketplaceStatus,
            marketplaceImageProcessingStatus: "PROCESSING_SUCCESSFUL",
            marketplaceMiniImageURL: formattedMiniImageUrl,
            marketplaceThumbnailImageURL: formattedThumbnailUrl,
            marketplaceCardImageURL: formattedCardImageUrl,
            lastUpdatedAt: now,
          },
          { merge: true },
        ),
      ]);

      logger.info("Marketplace image derivatives generated", {
        collectionName: parsed.collectionName,
        designId: parsed.designId,
        sourcePath: parsed.sourcePath,
        generation,
        derivativeBasePath,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("Marketplace image derivative generation failed", {
        sourcePath: parsed.sourcePath,
        collectionName: parsed.collectionName,
        designId: parsed.designId,
        generation,
        errorMessage,
      });

      await setOriginalMetadataStatus(sourceFile, STATUS.DERIVATIVES_FAILED, generation, {
        marketplaceAssetProcessingError: errorMessage,
      });
      await docRef.set(
        {
          marketplaceImageProcessingStatus: "PROCESSING_FAILURE",
        },
        { merge: true },
      );

      throw error;
    }
  },
);
