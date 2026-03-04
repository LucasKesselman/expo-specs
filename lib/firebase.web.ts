/**
 * Firebase initialization for web. Uses browser local persistence for auth.
 * Metro resolves this file when platform is web; use firebase.ts for native.
 *
 * @module lib/firebase.web
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { firebaseConfig } from "./firebase.config";

const STORAGE_BUCKET = "gs://pygmalions-specs.firebasestorage.app";

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: browserLocalPersistence,
  });
  db = getFirestore(app);
  storage = getStorage(app, STORAGE_BUCKET);
} else {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app, STORAGE_BUCKET);
}

export { app, auth, db, storage };
