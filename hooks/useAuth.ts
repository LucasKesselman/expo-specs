import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged,
  type User,
  type AuthError,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export function useAuthState(): User | null {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);
  return user;
}

function getAuthErrorMessage(err: AuthError): string {
  const code = err.code;
  if (code === "auth/invalid-email") return "Invalid email address.";
  if (code === "auth/user-disabled") return "This account has been disabled.";
  if (code === "auth/user-not-found") return "No account found with this email.";
  if (code === "auth/wrong-password") return "Incorrect password.";
  if (code === "auth/email-already-in-use") return "This email is already in use.";
  if (code === "auth/weak-password") return "Password should be at least 6 characters.";
  if (code === "auth/too-many-requests") return "Too many attempts. Try again later.";
  if (code === "auth/invalid-credential") return "Invalid email or password.";
  return err.message || "An error occurred.";
}

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const login = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(getAuthErrorMessage(err as AuthError));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(getAuthErrorMessage(err as AuthError));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      setError(getAuthErrorMessage(err as AuthError));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (idToken: string, accessToken?: string) => {
    setError(null);
    setLoading(true);
    try {
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      await signInWithCredential(auth, credential);
    } catch (err) {
      setError((err as AuthError).message ?? "Google sign-in failed.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { login, signUp, resetPassword, signInWithGoogle, loading, error, clearError };
}
