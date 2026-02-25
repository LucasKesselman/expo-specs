/**
 * Template for Firebase Web app config. Copy this file to firebase.config.ts
 * and replace placeholder values. Get config from Firebase Console → Project
 * settings → Your apps → Web app. Do not commit firebase.config.ts (gitignored).
 *
 * @example
 * cp lib/firebase.config.example.ts lib/firebase.config.ts
 * // Then edit lib/firebase.config.ts with your apiKey, projectId, etc.
 */

export const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  // Optional, for Firestore/Realtime DB later:
  // databaseURL: "https://your-project-id.firebaseio.com",
  // measurementId: "G-XXXXXXXXXX",
};
