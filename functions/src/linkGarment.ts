import admin from "firebase-admin";
import { logger } from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const REGION = "us-central1";
const GARMENTS_COLLECTION = "Garments";
const USERS_COLLECTION = "Users";

interface LinkGarmentRequest {
  garmentId: unknown;
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

/** True when owner exists and contains any non-empty data. */
function hasExistingOwner(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
}

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const linkGarment = onCall({ region: REGION }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be signed in to link a garment.");
  }

  const requestData = request.data as LinkGarmentRequest;
  const garmentId = normalizeRequiredString(requestData.garmentId, "garmentId");

  const garmentRef = db.collection(GARMENTS_COLLECTION).doc(garmentId);
  const userRef = db.collection(USERS_COLLECTION).doc(uid);

  try {
    await db.runTransaction(async (transaction) => {
      const garmentSnapshot = await transaction.get(garmentRef);
      if (!garmentSnapshot.exists) {
        throw new HttpsError("not-found", "Garment not found.");
      }

      const garmentData = garmentSnapshot.data() ?? {};
      if (hasExistingOwner(garmentData.owner)) {
        throw new HttpsError("failed-precondition", "Garment already has an owner.");
      }

      transaction.update(garmentRef, {
        owner: uid,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      transaction.set(
        userRef,
        { ownedGarments: admin.firestore.FieldValue.arrayUnion(garmentId) },
        { merge: true },
      );
    });
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    logger.error("linkGarment transaction failed", {
      garmentId,
      uid,
      error,
    });
    throw new HttpsError("internal", "Failed to link garment. Please try again.");
  }

  logger.info("Linked garment to user", { garmentId, uid });

  return { garmentId, owner: uid };
});
