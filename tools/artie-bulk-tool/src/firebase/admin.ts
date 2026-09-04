import { existsSync } from "node:fs";
import path from "node:path";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import {
  DEFAULT_PROJECT_ID,
  DEFAULT_SERVICE_ACCOUNT_PATH,
  TOOL_ROOT,
} from "../config.js";
import { logger } from "../logging.js";

dotenv.config({ path: path.join(TOOL_ROOT, ".env") });

export interface AdminContext {
  db: Firestore;
  projectId: string;
}

export function resolveCredentialPath(): string | undefined {
  const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(TOOL_ROOT, fromEnv);
  }
  if (existsSync(DEFAULT_SERVICE_ACCOUNT_PATH)) {
    return DEFAULT_SERVICE_ACCOUNT_PATH;
  }
  return undefined;
}

export function initializeAdmin(): AdminContext {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || DEFAULT_PROJECT_ID;
  const credentialPath = resolveCredentialPath();

  if (getApps().length === 0) {
    if (credentialPath) {
      if (!existsSync(credentialPath)) {
        throw new Error(`Service account file not found: ${credentialPath}`);
      }
      initializeApp({
        credential: cert(credentialPath),
        projectId,
      });
      logger.info("Initialized Firebase Admin with service account.", {
        credentialPath,
        projectId,
      });
    } else {
      initializeApp({
        credential: applicationDefault(),
        projectId,
      });
      logger.info("Initialized Firebase Admin with application default credentials.", {
        projectId,
      });
    }
  }

  const db = getFirestore();
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // settings() throws if Firestore was already started
  }

  return { db, projectId };
}
