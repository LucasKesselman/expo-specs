import admin from "firebase-admin";
import { logger } from "firebase-functions/logger";
import { onRequest } from "firebase-functions/v2/https";
import Stripe from "stripe";
import { generateGarmentQRCodesForGarments } from "./generateGarmentQRCodes";

const REGION = "us-central1";
const GARMENTS_COLLECTION = "Garments";
const USERS_COLLECTION = "Users";
const DIGITAL_DESIGNS_COLLECTION = "DigitalDesigns";
const PHYSICAL_DESIGNS_COLLECTION = "PhysicalDesigns";
const STRIPE_WEBHOOK_EVENTS_COLLECTION = "StripeWebhookEvents";

const DEFAULT_PRINT_STATUS = "NOT_PRINTED";
const DEFAULT_QR_CODE_STATUS = "NOT_GENERATED";

type GarmentSize = "XS" | "S" | "M" | "L" | "XL";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

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

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
}

function normalizeSize(value: unknown): GarmentSize {
  const normalizedValue = normalizeRequiredString(value, "size").toUpperCase();
  if (
    normalizedValue !== "XS" &&
    normalizedValue !== "S" &&
    normalizedValue !== "M" &&
    normalizedValue !== "L" &&
    normalizedValue !== "XL"
  ) {
    throw new Error("size must be one of XS, S, M, L, or XL.");
  }

  return normalizedValue;
}

function normalizeQuantity(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return 1;
  }

  return value;
}

function normalizeMetadataRecord(metadata: unknown): Record<string, string> {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value !== "string") {
      continue;
    }

    const normalizedValue = value.trim();
    if (!normalizedValue) {
      continue;
    }

    normalized[key] = normalizedValue;
  }

  return normalized;
}

function getMetadataValue(
  metadata: Record<string, string>,
  keys: readonly string[],
  fieldName: string,
): string {
  for (const key of keys) {
    const value = metadata[key];
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing required line item metadata field: ${fieldName}.`);
}

function buildLineItemMetadata(lineItem: Stripe.LineItem): Record<string, string> {
  const lineItemWithMetadata = lineItem as Stripe.LineItem & { metadata?: Stripe.Metadata };
  const lineItemMetadata = normalizeMetadataRecord(lineItemWithMetadata.metadata);

  const price =
    lineItem.price && typeof lineItem.price !== "string" ? lineItem.price : undefined;
  const priceMetadata = normalizeMetadataRecord(price?.metadata);

  const product =
    price?.product && typeof price.product !== "string" ? price.product : undefined;
  const productMetadata =
    product && !("deleted" in product && product.deleted)
      ? normalizeMetadataRecord(product.metadata)
      : {};

  return {
    ...productMetadata,
    ...priceMetadata,
    ...lineItemMetadata,
  };
}

function buildGarmentId(sessionId: string, lineItem: Stripe.LineItem, unitIndex: number): string {
  const lineItemId = lineItem.id ?? `lineItem_${unitIndex + 1}`;
  return `${sessionId}_${lineItemId}_${unitIndex + 1}`;
}

export const createGarment = onRequest({ region: REGION }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed. Use POST.");
    return;
  }

  const stripeSignatureHeader = req.headers["stripe-signature"];
  if (!stripeSignatureHeader || Array.isArray(stripeSignatureHeader)) {
    res.status(400).send("Missing Stripe signature header.");
    return;
  }

  let eventRef: FirebaseFirestore.DocumentReference | null = null;

  try {
    const stripeSecretKey = getRequiredEnvVar("STRIPE_SECRET_KEY");
    const stripeWebhookSecret = getRequiredEnvVar("STRIPE_WEBHOOK_SECRET");

    const stripe = new Stripe(stripeSecretKey);
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new Error("Missing raw request body required for Stripe signature verification.");
    }

    const event = stripe.webhooks.constructEvent(rawBody, stripeSignatureHeader, stripeWebhookSecret);
    if (event.type !== "checkout.session.completed") {
      logger.info("Ignoring non-checkout event", { eventId: event.id, eventType: event.type });
      res.status(200).json({ received: true, ignored: true });
      return;
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const sessionId = normalizeRequiredString(session.id, "session.id");
    eventRef = db.collection(STRIPE_WEBHOOK_EVENTS_COLLECTION).doc(event.id);

    const shouldProcess = await db.runTransaction(async (transaction) => {
      const eventSnapshot = await transaction.get(eventRef!);
      if (eventSnapshot.exists) {
        const status = eventSnapshot.get("status");
        if (status === "PROCESSED" || status === "PROCESSING") {
          return false;
        }
      }

      transaction.set(
        eventRef!,
        {
          id: event.id,
          type: event.type,
          status: "PROCESSING",
          sessionId,
          attemptCount: admin.firestore.FieldValue.increment(1),
          lastAttemptedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return true;
    });

    if (!shouldProcess) {
      logger.info("Skipping already-processed Stripe event", { eventId: event.id, sessionId });
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 100,
      expand: ["data.price.product"],
    });

    if (!lineItems.data.length) {
      throw new Error("No line items were found for checkout.session.completed.");
    }

    const batch = db.batch();
    const garmentIds: string[] = [];

    lineItems.data.forEach((lineItem, lineItemIndex) => {
      const metadata = buildLineItemMetadata(lineItem);

      const owner = normalizeRequiredString(
        getMetadataValue(metadata, ["owner", "ownerUid", "uid"], "owner"),
        "owner",
      );
      const digitalDesignId = normalizeRequiredString(
        getMetadataValue(metadata, ["digitalDesignId", "digitalDesign"], "digitalDesignId"),
        "digitalDesignId",
      );
      const physicalDesignId = normalizeRequiredString(
        getMetadataValue(metadata, ["physicalDesignId", "physicalDesign"], "physicalDesignId"),
        "physicalDesignId",
      );
      const size = normalizeSize(getMetadataValue(metadata, ["size"], "size"));
      const color = normalizeRequiredString(getMetadataValue(metadata, ["color"], "color"), "color");
      const version = normalizeOptionalString(metadata.version);

      const quantity = normalizeQuantity(lineItem.quantity);
      for (let unitIndex = 0; unitIndex < quantity; unitIndex += 1) {
        const garmentId = buildGarmentId(
          sessionId,
          lineItem,
          lineItemIndex * Math.max(quantity, 1) + unitIndex,
        );
        const garmentRef = db.collection(GARMENTS_COLLECTION).doc(garmentId);
        const userRef = db.collection(USERS_COLLECTION).doc(owner);

        const garmentPayload: Record<string, unknown> = {
          id: garmentId,
          owner,
          digitalDesign: db.doc(`${DIGITAL_DESIGNS_COLLECTION}/${digitalDesignId}`),
          physicalDesign: db.doc(`${PHYSICAL_DESIGNS_COLLECTION}/${physicalDesignId}`),
          printStatus: DEFAULT_PRINT_STATUS,
          size,
          color,
          qrCodeStatus: DEFAULT_QR_CODE_STATUS,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (version) {
          garmentPayload.version = version;
        }

        batch.set(garmentRef, garmentPayload, { merge: true });
        batch.set(
          userRef,
          { ownedGarments: admin.firestore.FieldValue.arrayUnion(garmentId) },
          { merge: true },
        );

        garmentIds.push(garmentId);
      }
    });

    await batch.commit();
    const qrGenerationResult = await generateGarmentQRCodesForGarments(garmentIds);

    await eventRef.set(
      {
        status: "PROCESSED",
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        garmentCount: garmentIds.length,
        garmentIds,
        qrGeneration: {
          generatedCount: qrGenerationResult.generatedCount,
          skippedCount: qrGenerationResult.skippedCount,
          totalGarments: qrGenerationResult.totalGarments,
        },
      },
      { merge: true },
    );

    logger.info("Created garments from checkout.session.completed", {
      eventId: event.id,
      sessionId,
      garmentCount: garmentIds.length,
      garmentIds,
      qrGeneratedCount: qrGenerationResult.generatedCount,
      qrSkippedCount: qrGenerationResult.skippedCount,
    });

    res.status(200).json({
      received: true,
      processed: true,
      garmentCount: garmentIds.length,
      qrGeneration: qrGenerationResult,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    logger.error("Failed to process createGarment webhook", {
      errorMessage,
    });

    if (eventRef) {
      await eventRef.set(
        {
          status: "FAILED",
          lastError: errorMessage,
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    res.status(400).send(errorMessage);
  }
});
