import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

import { auth, firestore } from "../lib/firebase";

export type SignUpProfile = {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
};

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (profile: SignUpProfile) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      signUp: async ({ email, password, username, firstName, lastName }) => {
        const normalizedEmail = email.trim();
        const normalizedUsername = username.trim();
        const normalizedFirstName = firstName.trim();
        const normalizedLastName = lastName.trim();

        const credential = await createUserWithEmailAndPassword(
          auth,
          normalizedEmail,
          password,
        );

        if (normalizedUsername) {
          await updateProfile(credential.user, { displayName: normalizedUsername });
        }

        // Merge profile scalars only — Auth onCreate owns empty array fields.
        await setDoc(
          doc(firestore, "Users", credential.user.uid),
          {
            id: credential.user.uid,
            email: normalizedEmail,
            username: normalizedUsername,
            firstName: normalizedFirstName,
            lastName: normalizedLastName,
          },
          { merge: true },
        );
      },
      signOut: async () => {
        await firebaseSignOut(auth);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
