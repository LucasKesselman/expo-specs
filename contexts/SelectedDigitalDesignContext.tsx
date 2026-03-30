import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "./AuthContext";
import type { MarketplaceDesign } from "../types/marketplaceDesign";

const STORAGE_KEY_PREFIX = "selectedDigitalDesign";

interface SelectedDigitalDesignContextValue {
  selectedDesign: MarketplaceDesign | null;
  isLoaded: boolean;
  selectDesign: (design: MarketplaceDesign) => Promise<void>;
  clearSelectedDesign: () => Promise<void>;
}

const SelectedDigitalDesignContext = createContext<SelectedDigitalDesignContextValue | null>(null);

function getStorageKey(uid: string) {
  return `${STORAGE_KEY_PREFIX}:${uid}`;
}

function isMarketplaceDesign(value: unknown): value is MarketplaceDesign {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybe = value as Partial<MarketplaceDesign>;
  return (
    typeof maybe.sourceDocId === "string" &&
    typeof maybe.sourceCollection === "string" &&
    typeof maybe.documentId === "string" &&
    typeof maybe.name === "string"
  );
}

export function SelectedDigitalDesignProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedDesign, setSelectedDesign] = useState<MarketplaceDesign | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSelection = async () => {
      if (!user?.uid) {
        if (isMounted) {
          setSelectedDesign(null);
          setIsLoaded(true);
        }
        return;
      }

      setIsLoaded(false);
      try {
        const storedValue = await AsyncStorage.getItem(getStorageKey(user.uid));
        if (!isMounted) {
          return;
        }

        if (!storedValue) {
          setSelectedDesign(null);
          setIsLoaded(true);
          return;
        }

        const parsed = JSON.parse(storedValue) as unknown;
        setSelectedDesign(isMarketplaceDesign(parsed) ? parsed : null);
      } catch {
        if (isMounted) {
          setSelectedDesign(null);
        }
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    };

    void loadSelection();

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const selectDesign = useCallback(
    async (design: MarketplaceDesign) => {
      if (!user?.uid) {
        return;
      }

      setSelectedDesign(design);
      await AsyncStorage.setItem(getStorageKey(user.uid), JSON.stringify(design));
    },
    [user?.uid],
  );

  const clearSelectedDesign = useCallback(async () => {
    if (user?.uid) {
      await AsyncStorage.removeItem(getStorageKey(user.uid));
    }
    setSelectedDesign(null);
  }, [user?.uid]);

  const value = useMemo<SelectedDigitalDesignContextValue>(
    () => ({
      selectedDesign,
      isLoaded,
      selectDesign,
      clearSelectedDesign,
    }),
    [clearSelectedDesign, isLoaded, selectDesign, selectedDesign],
  );

  return (
    <SelectedDigitalDesignContext.Provider value={value}>
      {children}
    </SelectedDigitalDesignContext.Provider>
  );
}

export function useSelectedDigitalDesign() {
  const context = useContext(SelectedDigitalDesignContext);
  if (!context) {
    throw new Error("useSelectedDigitalDesign must be used inside SelectedDigitalDesignProvider.");
  }

  return context;
}
