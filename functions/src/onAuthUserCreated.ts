import admin from "firebase-admin";
import { logger } from "firebase-functions/logger";
import * as functions from "firebase-functions/v1";

const REGION = "us-central1";
const USERS_COLLECTION = "Users";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Auth user create is 1st gen only (Gen 2 does not support post-create Auth triggers yet).
 * Creates Users/{uid} skeleton; client signup merges firstName/lastName/username afterward.
 */
export const onAuthUserCreated = functions
  .region(REGION)
  .auth.user()
  .onCreate(async (user) => {
    const uid = user.uid;
    const ref = db.collection(USERS_COLLECTION).doc(uid);

    try {
      const snap = await ref.get();
      if (snap.exists) {
        logger.info("Users doc already exists; skipping create", { uid });
        return;
      }

      await ref.set({
        id: uid,
        email: user.email ?? "",
        username: user.displayName ?? "",
        firstName: "",
        lastName: "",
        savedDigitalDesigns: [],
        savedPhysicalDesigns: [],
        ownedGarments: [],
      });

      logger.info("Created Users doc for new Auth user", { uid });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to create Users doc for Auth user", { uid, errorMessage });
      throw error;
    }
  });
