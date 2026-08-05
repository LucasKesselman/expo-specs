import admin from "firebase-admin";
import { logger } from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const REGION = "us-central1";
const GARMENTS_COLLECTION = "Garments";
const DIGITAL_DESIGNS_COLLECTION = "DigitalDesigns";
const USERS_COLLECTION = "Users";

interface AssignDigitalDesignToGarmentRequest {
  garmentId: unknown;
  digitalDesignId: unknown;
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

function normalizeLinkedId(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    if (trimmed.includes("/")) {
      const segments = trimmed.split("/").filter(Boolean);
      return segments.length ? segments[segments.length - 1] : trimmed;
    }
    return trimmed;
  }

  if (typeof value === "object" && value !== null) {
    if ("id" in value && typeof (value as { id?: unknown }).id === "string") {
      const id = (value as { id: string }).id.trim();
      if (id) {
        return id;
      }
    }
    if ("path" in value && typeof (value as { path?: unknown }).path === "string") {
      const path = (value as { path: string }).path.trim();
      if (path) {
        const segments = path.split("/").filter(Boolean);
        return segments.length ? segments[segments.length - 1] : null;
      }
    }
  }

  return null;
}

function arrayContainsId(rawArray: unknown, targetId: string): boolean {
  if (!Array.isArray(rawArray)) {
    return false;
  }

  return rawArray.some((entry) => normalizeLinkedId(entry) === targetId);
}

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const assignDigitalDesignToGarment = onCall({ region: REGION }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "You must be signed in to assign a digital design to a garment.",
    );
  }

  const requestData = request.data as AssignDigitalDesignToGarmentRequest;
  const garmentId = normalizeRequiredString(requestData.garmentId, "garmentId");
  const digitalDesignId = normalizeRequiredString(
    requestData.digitalDesignId,
    "digitalDesignId",
  );

  const userSnapshot = await db.collection(USERS_COLLECTION).doc(uid).get();
  if (!userSnapshot.exists) {
    throw new HttpsError("failed-precondition", "User profile not found.");
  }

  const userData = userSnapshot.data() ?? {};
  if (!arrayContainsId(userData.ownedGarments, garmentId)) {
    throw new HttpsError(
      "permission-denied",
      "This garment is not in your owned garments.",
    );
  }
  if (!arrayContainsId(userData.savedDigitalDesigns, digitalDesignId)) {
    throw new HttpsError(
      "permission-denied",
      "This digital design is not in your wardrobe.",
    );
  }

  const garmentRef = db.collection(GARMENTS_COLLECTION).doc(garmentId);
  const designRef = db.collection(DIGITAL_DESIGNS_COLLECTION).doc(digitalDesignId);

  const [garmentSnapshot, designSnapshot] = await Promise.all([
    garmentRef.get(),
    designRef.get(),
  ]);

  if (!garmentSnapshot.exists) {
    throw new HttpsError("not-found", "Garment not found.");
  }
  if (!designSnapshot.exists) {
    throw new HttpsError("not-found", "Digital design not found.");
  }

  const garmentOwner = garmentSnapshot.data()?.owner;
  if (typeof garmentOwner === "string" && garmentOwner.trim() && garmentOwner !== uid) {
    throw new HttpsError("permission-denied", "You do not own this garment.");
  }

  await garmentRef.update({
    digitalDesign: designRef,
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info("Assigned digital design to garment", {
    uid,
    garmentId,
    digitalDesignId,
  });

  return { garmentId, digitalDesignId };
});
