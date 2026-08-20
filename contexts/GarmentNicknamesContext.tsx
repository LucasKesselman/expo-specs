import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "./AuthContext";

const STORAGE_KEY_PREFIX = "garmentNicknames";

type NicknameMap = Record<string, string>;

interface GarmentNicknamesContextValue {
  nicknames: NicknameMap;
  isLoaded: boolean;
  getNickname: (garmentId: string) => string;
  setNickname: (garmentId: string, nickname: string) => Promise<void>;
}

const GarmentNicknamesContext = createContext<GarmentNicknamesContextValue | null>(null);

function getStorageKey(uid: string) {
  return `${STORAGE_KEY_PREFIX}:${uid}`;
}

function parseNicknameMap(value: unknown): NicknameMap {
  if (!value || typeof value !== "object") {
    return {};
  }

  const nicknames: NicknameMap = {};
  for (const [garmentId, nickname] of Object.entries(value)) {
    if (typeof nickname === "string" && nickname.trim()) {
      nicknames[garmentId] = nickname.trim();
    }
  }
  return nicknames;
}

export function GarmentNicknamesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [nicknames, setNicknames] = useState<NicknameMap>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadNicknames = async () => {
      if (!user?.uid) {
        if (isMounted) {
          setNicknames({});
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
          setNicknames({});
          return;
        }

        const parsed = JSON.parse(storedValue) as unknown;
        setNicknames(parseNicknameMap(parsed));
      } catch {
        if (isMounted) {
          setNicknames({});
        }
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    };

    void loadNicknames();

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const persistNicknames = useCallback(
    async (nextNicknames: NicknameMap) => {
      if (!user?.uid) {
        return;
      }

      await AsyncStorage.setItem(getStorageKey(user.uid), JSON.stringify(nextNicknames));
    },
    [user?.uid],
  );

  const getNickname = useCallback(
    (garmentId: string) => {
      return nicknames[garmentId] ?? "";
    },
    [nicknames],
  );

  const setNickname = useCallback(
    async (garmentId: string, nickname: string) => {
      const trimmed = nickname.trim();
      const nextNicknames = { ...nicknames };

      if (trimmed) {
        nextNicknames[garmentId] = trimmed;
      } else {
        delete nextNicknames[garmentId];
      }

      setNicknames(nextNicknames);
      await persistNicknames(nextNicknames);
    },
    [nicknames, persistNicknames],
  );

  const value = useMemo<GarmentNicknamesContextValue>(
    () => ({
      nicknames,
      isLoaded,
      getNickname,
      setNickname,
    }),
    [getNickname, isLoaded, nicknames, setNickname],
  );

  return (
    <GarmentNicknamesContext.Provider value={value}>{children}</GarmentNicknamesContext.Provider>
  );
}

export function useGarmentNicknames() {
  const context = useContext(GarmentNicknamesContext);
  if (!context) {
    throw new Error("useGarmentNicknames must be used inside GarmentNicknamesProvider.");
  }

  return context;
}
