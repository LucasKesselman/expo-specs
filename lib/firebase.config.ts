const fallbackFirebaseConfig = {
  apiKey: "AIzaSyD4W0y8dpLvTQ0VFNniFJJtqVzGjbdpfjg",
  authDomain: "pygmalions-specs.firebaseapp.com",
  databaseURL: "https://pygmalions-specs-default-rtdb.firebaseio.com",
  projectId: "pygmalions-specs",
  storageBucket: "pygmalions-specs.firebasestorage.app",
  messagingSenderId: "988189221716",
  appId: "1:988189221716:web:7ce2741a3be5558ba51ec1",
};

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? fallbackFirebaseConfig.apiKey,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? fallbackFirebaseConfig.authDomain,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ?? fallbackFirebaseConfig.databaseURL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? fallbackFirebaseConfig.projectId,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? fallbackFirebaseConfig.storageBucket,
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
    fallbackFirebaseConfig.messagingSenderId,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? fallbackFirebaseConfig.appId,
};
