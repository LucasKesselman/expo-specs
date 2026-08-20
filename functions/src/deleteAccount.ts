import admin from "firebase-admin";
import { logger } from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const REGION = "us-central1";
const GARMENTS_COLLECTION = "Garments";
const USERS_COLLECTION = "Users";
const MAX_TRANSACTION_WRITES = 450;

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

function extractGarmentIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const ids = new Set<string>();
  for (const value of raw) {
    if (typeof value === "string" && value.trim()) {
      const segments = value.trim().split("/").filter(Boolean);
      const garmentId = segments.length ? segments[segments.length - 1] : value.trim();
      if (garmentId) {
        ids.add(garmentId);
      }
      continue;
    }

    if (typeof value === "object" && value !== null && "id" in value) {
      const maybeId = (value as { id?: unknown }).id;
      if (typeof maybeId === "string" && maybeId.trim()) {
        ids.add(maybeId.trim());
      }
    }
  }

  return [...ids];
}

function ownerMatchesUid(owner: unknown, uid: string): boolean {
  if (typeof owner === "string") {
    return owner.trim() === uid;
  }

  if (typeof owner === "object" && owner !== null && "id" in owner) {
    const maybeId = (owner as { id?: unknown }).id;
    return typeof maybeId === "string" && maybeId.trim() === uid;
  }

  return false;
}

function unlinkOwnedGarments(
  transaction: FirebaseFirestore.Transaction,
  uid: string,
  garmentRefs: FirebaseFirestore.DocumentReference[],
  garmentSnapshots: FirebaseFirestore.DocumentSnapshot[],
) {
  garmentSnapshots.forEach((snapshot, index) => {
    if (!snapshot.exists) {
      return;
    }

    const owner = snapshot.data()?.owner;
    if (!ownerMatchesUid(owner, uid)) {
      return;
    }

    transaction.update(garmentRefs[index], {
      owner: admin.firestore.FieldValue.delete(),
      digitalDesign: null,
      lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
}

async function unlinkGarmentsAndDeleteUser(uid: string): Promise<void> {
  const userRef = db.collection(USERS_COLLECTION).doc(uid);

  await db.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const garmentIds = extractGarmentIds(userSnapshot.data()?.ownedGarments);
    const garmentRefs = garmentIds.map((garmentId) =>
      db.collection(GARMENTS_COLLECTION).doc(garmentId),
    );

    if (garmentRefs.length > MAX_TRANSACTION_WRITES) {
      throw new HttpsError(
        "resource-exhausted",
        "This account owns too many garments to delete automatically. Contact support.",
      );
    }

    const garmentSnapshots =
      garmentRefs.length > 0 ? await transaction.getAll(...garmentRefs) : [];

    unlinkOwnedGarments(transaction, uid, garmentRefs, garmentSnapshots);

    if (userSnapshot.exists) {
      transaction.delete(userRef);
    }
  });
}

async function deleteStagedUploads(uid: string): Promise<void> {
  const prefix = `_temp/${uid}/`;
  try {
    await admin.storage().bucket().deleteFiles({ prefix, force: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.warn("Failed to delete staged uploads during account deletion", {
      uid,
      prefix,
      errorMessage,
    });
  }
}

export const deleteAccount = onCall({ region: REGION }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be signed in to delete your account.");
  }

  try {
    await unlinkGarmentsAndDeleteUser(uid);
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    logger.error("Failed to unlink garments or delete user document", {
      uid,
      error,
    });
    throw new HttpsError("internal", "Failed to delete account data. Please try again.");
  }

  await deleteStagedUploads(uid);

  try {
    await admin.auth().deleteUser(uid);
  } catch (error) {
    const errorCode =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";

    if (errorCode === "auth/user-not-found") {
      logger.info("Auth user already deleted", { uid });
      return { deleted: true };
    }

    logger.error("Firestore cleaned up but Auth delete failed", { uid, error });
    throw new HttpsError(
      "internal",
      "Account data was removed but sign-in cleanup failed. Contact support.",
    );
  }

  logger.info("Deleted account", { uid });
  return { deleted: true };
});
