"use client";

import React, { createContext, useContext, type ReactNode } from "react";
import { useAuthState } from "@/hooks/useAuth";
import { useSavedDesigns } from "@/hooks/useSavedDesigns";

/** Same shape as useSavedDesigns return value. */
export type SavedDesignsContextValue = ReturnType<typeof useSavedDesigns>;

const SavedDesignsContext = createContext<SavedDesignsContextValue | null>(null);

/**
 * Provides a single shared source of truth for the current user's saved designs.
 * Use this so that when the user removes (or adds) a design on one screen (e.g. Account),
 * the other screen (e.g. Marketplace) immediately reflects the change without refetching.
 */
export function SavedDesignsProvider({ children }: { children: ReactNode }) {
  const user = useAuthState();
  const value = useSavedDesigns(user?.uid ?? null);
  return (
    <SavedDesignsContext.Provider value={value}>
      {children}
    </SavedDesignsContext.Provider>
  );
}

/**
 * Use the shared saved-designs state. Must be used within SavedDesignsProvider.
 * Keeps Marketplace and Account (and any other consumer) in sync with Firestore changes.
 */
export function useSavedDesignsContext(): SavedDesignsContextValue {
  const ctx = useContext(SavedDesignsContext);
  if (!ctx) {
    throw new Error("useSavedDesignsContext must be used within SavedDesignsProvider");
  }
  return ctx;
}
