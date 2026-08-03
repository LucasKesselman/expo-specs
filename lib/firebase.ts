import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  type Auth,
  type Persistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

import { firebaseConfig } from "./firebase.config";

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

type ReactNativePersistenceFactory = (storage: typeof AsyncStorage) => Persistence;

function createAuth(firebaseApp: FirebaseApp): Auth {
  if (Platform.OS === "web") {
    return getAuth(firebaseApp);
  }

  try {
    // Metro resolves @firebase/auth to the RN entry that exports this helper.
    // Default firebase/auth typings omit it, so load it from the RN package entry.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const authPackage = require("@firebase/auth") as {
      getReactNativePersistence?: ReactNativePersistenceFactory;
    };

    if (!authPackage.getReactNativePersistence) {
      return getAuth(firebaseApp);
    }

    return initializeAuth(firebaseApp, {
      persistence: authPackage.getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Fast Refresh / hot reload can re-run this module after Auth is already initialized.
    return getAuth(firebaseApp);
  }
}

export const firestore = getFirestore(app);
export const storage = getStorage(app);
export const arAssetsStorage = getStorage(app, "gs://ar-assets-bucket");
export const functions = getFunctions(app, "us-central1");
export const auth = createAuth(app);
export { app };
