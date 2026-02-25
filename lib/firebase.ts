/**
 * Firebase initialization for native (iOS/Android). Uses React Native AsyncStorage
 * for auth persistence. Metro resolves this file when platform is not web;
 * use firebase.web.ts for web builds.
 *
 * @module lib/firebase
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig } from "./firebase.config";

// React Native persistence – only in this file, not loaded on web
// @ts-expect-error - getReactNativePersistence not in default auth types
import { initializeAuth, getReactNativePersistence } from "@firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
  db = getFirestore(app);
} else {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
}

/** Firebase App (for Functions, etc.). */
export { app };
/** Firebase Auth instance (native persistence). */
export { auth };
/** Firestore instance for users/savedDesigns. */
export { db };
