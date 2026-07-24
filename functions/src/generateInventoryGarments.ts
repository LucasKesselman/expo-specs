import admin from "firebase-admin";
import { logger } from "firebase-functions/logger";
import { onRequest } from "firebase-functions/v2/https";

import { generateGarmentQRCodesForGarments } from "./generateGarmentQRCodes";

const REGION = "us-central1";
const GARMENTS_COLLECTION = "Garments";
const PHYSICAL_DESIGNS_COLLECTION = "PhysicalDesigns";

const DEFAULT_PRINT_STATUS = "NOT_PRINTED";
const DEFAULT_SHIPPED_STATUS = "ORDERED";
const DEFAULT_QR_CODE_STATUS = "PENDING";
const DEFAULT_VERIFICATION_STATUS = "NOT_VERIFIED";
const DEFAULT_COLOR = "UNSPECIFIED";
const MAX_QUANTITY = 500;
const FIRESTORE_BATCH_LIMIT = 400;

type GarmentSize = "XS" | "S" | "M" | "L" | "XL" | "XXL";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string.`);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function normalizeSize(value: unknown): GarmentSize {
  const normalizedValue = normalizeRequiredString(value, "size").toUpperCase();
  if (
    normalizedValue !== "XS" &&
    normalizedValue !== "S" &&
    normalizedValue !== "M" &&
    normalizedValue !== "L" &&
    normalizedValue !== "XL" &&
    normalizedValue !== "XXL"
  ) {
    throw new Error("size must be one of XS, S, M, L, XL or XXL.");
  }

  return normalizedValue;
}

function normalizeQuantity(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error("quantity must be a positive integer.");
  }

  if (value > MAX_QUANTITY) {
    throw new Error(`quantity must be at most ${MAX_QUANTITY}.`);
  }

  return value;
}

function parseQuantitySize(value: unknown): { quantity: number; size: GarmentSize } {
  const raw = normalizeRequiredString(value, "quantitySize");
  const match = raw.match(/^(\d+)\s*,\s*([A-Za-z]+)$/);
  if (!match) {
    throw new Error('quantitySize must look like "50, L".');
  }

  return {
    quantity: normalizeQuantity(Number.parseInt(match[1], 10)),
    size: normalizeSize(match[2]),
  };
}

function resolveQuantityAndSize(body: Record<string, unknown>): {
  quantity: number;
  size: GarmentSize;
} {
  const hasExplicitQuantity = body.quantity !== undefined;
  const hasExplicitSize = body.size !== undefined;

  if (hasExplicitQuantity || hasExplicitSize) {
    if (!hasExplicitQuantity || !hasExplicitSize) {
      throw new Error("Provide both quantity and size, or quantitySize alone.");
    }

    return {
      quantity: normalizeQuantity(body.quantity),
      size: normalizeSize(body.size),
    };
  }

  if (body.quantitySize !== undefined) {
    return parseQuantitySize(body.quantitySize);
  }

  throw new Error('Provide quantity and size, or quantitySize like "50, L".');
}

async function commitGarmentBatches(
  payloads: Array<{ ref: admin.firestore.DocumentReference; data: Record<string, unknown> }>,
): Promise<void> {
  for (let offset = 0; offset < payloads.length; offset += FIRESTORE_BATCH_LIMIT) {
    const chunk = payloads.slice(offset, offset + FIRESTORE_BATCH_LIMIT);
    const batch = db.batch();
    for (const item of chunk) {
      batch.set(item.ref, item.data);
    }
    await batch.commit();
  }
}

export const generateInventoryGarments = onRequest(
  { region: REGION, invoker: "private" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed. Use POST.");
      return;
    }

    try {
      const body =
        req.body && typeof req.body === "object" && !Array.isArray(req.body)
          ? (req.body as Record<string, unknown>)
          : {};

      const physicalDesignId = normalizeRequiredString(body.physicalDesignId, "physicalDesignId");
      const { quantity, size } = resolveQuantityAndSize(body);
      const backprintVersion = normalizeRequiredString(body.backprintVersion, "backprintVersion");

      const physicalDesignRef = db.collection(PHYSICAL_DESIGNS_COLLECTION).doc(physicalDesignId);
      const physicalDesignSnap = await physicalDesignRef.get();
      if (!physicalDesignSnap.exists) {
        res.status(400).send(`PhysicalDesign not found: ${physicalDesignId}`);
        return;
      }

      const physicalDesignData = physicalDesignSnap.data() ?? {};
      const designNumber =
        typeof physicalDesignData.designNumber === "string" && physicalDesignData.designNumber.trim()
          ? physicalDesignData.designNumber.trim()
          : "";
      if (!designNumber) {
        res.status(400).send(`PhysicalDesign is missing designNumber: ${physicalDesignId}`);
        return;
      }

      const version = `${designNumber}${backprintVersion}`;
      const color =
        typeof physicalDesignData.color === "string" && physicalDesignData.color.trim()
          ? physicalDesignData.color.trim()
          : DEFAULT_COLOR;

      const now = admin.firestore.FieldValue.serverTimestamp();
      const payloads: Array<{
        ref: admin.firestore.DocumentReference;
        data: Record<string, unknown>;
      }> = [];
      const garmentIds: string[] = [];

      for (let index = 0; index < quantity; index += 1) {
        const garmentRef = db.collection(GARMENTS_COLLECTION).doc();
        const garmentId = garmentRef.id;
        garmentIds.push(garmentId);

        payloads.push({
          ref: garmentRef,
          data: {
            id: garmentId,
            physicalDesign: physicalDesignRef,
            printStatus: DEFAULT_PRINT_STATUS,
            shippedStatus: DEFAULT_SHIPPED_STATUS,
            shippedUpdate: now,
            size,
            color,
            qrCodeStatus: DEFAULT_QR_CODE_STATUS,
            createdAt: now,
            version,
            verificationStatus: DEFAULT_VERIFICATION_STATUS,
          },
        });
      }

      await commitGarmentBatches(payloads);

      const qrGeneration = await generateGarmentQRCodesForGarments(garmentIds);

      logger.info("Generated inventory garments", {
        physicalDesignId,
        quantity,
        size,
        version,
        garmentCount: garmentIds.length,
        qrGeneratedCount: qrGeneration.generatedCount,
        qrSkippedCount: qrGeneration.skippedCount,
      });

      res.status(200).json({
        garmentCount: garmentIds.length,
        garmentIds,
        qrGeneration: {
          generatedCount: qrGeneration.generatedCount,
          skippedCount: qrGeneration.skippedCount,
          totalGarments: qrGeneration.totalGarments,
          uniqueGarmentsProcessed: qrGeneration.uniqueGarmentsProcessed,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to generate inventory garments", { errorMessage });
      res.status(400).send(errorMessage);
    }
  },
);
