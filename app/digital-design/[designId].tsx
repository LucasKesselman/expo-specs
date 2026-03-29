import { useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { collection, doc, getDoc } from "firebase/firestore";

import { firestore } from "../../lib/firebase";
import { mapFirestoreDocToMarketplaceDesign, type MarketplaceDesign } from "../../types/marketplaceDesign";

const DIGITAL_DESIGNS_COLLECTION_CANDIDATES = ["DigitalDesigns"] as const;
type LinkAppleZoomTargetModule = {
  AppleZoomTarget?: ComponentType<{ children: ReactNode }>;
};

function getParamAsString(param: string | string[] | undefined): string {
  if (typeof param === "string") {
    return param;
  }

  if (Array.isArray(param) && param.length > 0 && typeof param[0] === "string") {
    return param[0];
  }

  return "";
}

function getInitialDesignFromParams(params: ReturnType<typeof useLocalSearchParams>): MarketplaceDesign | null {
  const designId = getParamAsString(params.designId);

  if (!designId) {
    return null;
  }

  const documentId = getParamAsString(params.documentId);
  const name = getParamAsString(params.name);
  const description = getParamAsString(params.description);
  const updatedAt = getParamAsString(params.updatedAt);
  const thumbnailUrl = getParamAsString(params.thumbnailUrl);
  const fullImageUrl = getParamAsString(params.fullImageUrl);
  const sourceCollection =
    getParamAsString(params.collection) || DIGITAL_DESIGNS_COLLECTION_CANDIDATES[0];

  return {
    sourceDocId: designId,
    sourceCollection,
    documentId: documentId || designId,
    name: name || "Untitled design",
    description: description || "No description provided.",
    updatedAt: updatedAt || "N/A",
    price: "N/A",
    thumbnailUrl: thumbnailUrl || null,
    fullImageUrl: fullImageUrl || null,
    imageUrl: fullImageUrl || thumbnailUrl || null,
    createdAt: "N/A",
  };
}

function getAppleZoomTarget(): ComponentType<{ children: ReactNode }> | null {
  try {
    const linkModule = require("expo-router") as LinkAppleZoomTargetModule;
    return linkModule.AppleZoomTarget ?? null;
  } catch {
    return null;
  }
}

export default function DigitalDesignDetailScreen() {
  const params = useLocalSearchParams();
  const designId = getParamAsString(params.designId);
  const initialDesign = useMemo(() => getInitialDesignFromParams(params), [params]);
  const [design, setDesign] = useState<MarketplaceDesign | null>(initialDesign);
  const [isHydrating, setIsHydrating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const AppleZoomTarget = useMemo(() => getAppleZoomTarget(), []);

  useEffect(() => {
    if (!designId) {
      setErrorMessage("Missing design ID.");
      return;
    }

    let isMounted = true;

    const hydrateDesign = async () => {
      setIsHydrating(true);
      setErrorMessage(null);

      const preferredCollection = getParamAsString(params.collection);
      const candidates = preferredCollection
        ? [preferredCollection, ...DIGITAL_DESIGNS_COLLECTION_CANDIDATES.filter((name) => name !== preferredCollection)]
        : [...DIGITAL_DESIGNS_COLLECTION_CANDIDATES];

      try {
        for (const collectionName of candidates) {
          try {
            const snapshot = await getDoc(doc(collection(firestore, collectionName), designId));
            if (!snapshot.exists()) {
              continue;
            }

            if (isMounted) {
              const mapped = mapFirestoreDocToMarketplaceDesign(snapshot, collectionName);
              setDesign(mapped);
            }
            return;
          } catch (error) {
            const code =
              typeof error === "object" && error !== null && "code" in error
                ? String((error as { code?: unknown }).code)
                : "";

            if (code === "permission-denied" || code === "firestore/permission-denied") {
              continue;
            }

            throw error;
          }
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load design details.");
        }
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    };

    void hydrateDesign();

    return () => {
      isMounted = false;
    };
  }, [designId, params.collection]);

  const displayImageUrl = design?.fullImageUrl ?? design?.thumbnailUrl ?? design?.imageUrl ?? null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {AppleZoomTarget ? (
        <AppleZoomTarget>
          <View style={styles.heroContainer}>
            {displayImageUrl ? (
              <Image source={{ uri: displayImageUrl }} style={styles.heroImage} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <View style={styles.heroFallback}>
                <Text style={styles.heroFallbackText}>No preview image</Text>
              </View>
            )}
          </View>
        </AppleZoomTarget>
      ) : (
        <View style={styles.heroContainer}>
          {displayImageUrl ? (
            <Image source={{ uri: displayImageUrl }} style={styles.heroImage} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <View style={styles.heroFallback}>
              <Text style={styles.heroFallbackText}>No preview image</Text>
            </View>
          )}
        </View>
      )}

      <Text style={styles.title}>{design?.name ?? "Untitled design"}</Text>
      <Text style={styles.description}>{design?.description ?? "No description provided."}</Text>

      <View style={styles.metaContainer}>
        <Text style={styles.metaLabel}>Document ID</Text>
        <Text style={styles.metaValue}>{design?.documentId ?? designId}</Text>
      </View>
      <View style={styles.metaContainer}>
        <Text style={styles.metaLabel}>Last Updated</Text>
        <Text style={styles.metaValue}>{design?.updatedAt ?? "N/A"}</Text>
      </View>
      <View style={styles.metaContainer}>
        <Text style={styles.metaLabel}>Price</Text>
        <Text style={styles.metaValue}>{design?.price ?? "N/A"}</Text>
      </View>

      {isHydrating ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#93C5FD" />
          <Text style={styles.loadingText}>Refreshing design details...</Text>
        </View>
      ) : null}
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#111827",
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  heroContainer: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#030712",
  },
  heroImage: {
    width: "100%",
    aspectRatio: 1,
  },
  heroFallback: {
    width: "100%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1F2937",
  },
  heroFallbackText: {
    color: "#D1D5DB",
    fontSize: 14,
    fontWeight: "700",
  },
  title: {
    color: "#F9FAFB",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 18,
  },
  description: {
    color: "#CBD5E1",
    fontSize: 15,
    fontWeight: "500",
    marginTop: 10,
    lineHeight: 22,
  },
  metaContainer: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#030712",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  metaLabel: {
    color: "#93C5FD",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  metaValue: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  loadingRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "#93C5FD",
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
  },
});
