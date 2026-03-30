import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Link } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { collection, getDocs, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";

import { DigitalDesignCard } from "../../components/marketplace/DigitalDesignCard";
import { firestore } from "../../lib/firebase";
import { mapFirestoreDocToMarketplaceDesign, type MarketplaceDesign } from "../../types/marketplaceDesign";

const DIGITAL_DESIGNS_COLLECTION_CANDIDATES = ["DigitalDesigns"] as const;
const FALLBACK_ACCESSORY_HEIGHT = 70;
const FALLBACK_ACCESSORY_SPACING = 16;
type AppleZoomLink = typeof Link & {
  AppleZoom?: ComponentType<{ children: ReactNode }>;
};
const LinkWithAppleZoom = Link as AppleZoomLink;

function getSortTimestamp(doc: QueryDocumentSnapshot<DocumentData>): number {
  const data = doc.data();
  const candidates = [
    data.lastUpdatedAt,
    data.createdAt,
  ];

  for (const value of candidates) {
    if (!value) {
      continue;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    if (typeof value === "string") {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    if (typeof value === "object" && "toDate" in value) {
      const timestampValue = value as { toDate?: () => Date };
      if (typeof timestampValue.toDate === "function") {
        return timestampValue.toDate().getTime();
      }
    }
  }

  return 0;
}

export default function DigitalMarketplaceTabScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [designs, setDesigns] = useState<MarketplaceDesign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const listBottomInset =
    Platform.OS === "ios"
      ? undefined
      : tabBarHeight + FALLBACK_ACCESSORY_HEIGHT + FALLBACK_ACCESSORY_SPACING + insets.bottom;

  const loadDigitalDesigns = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setErrorMessage(null);

    try {
      const uniqueDesigns = new Map<string, MarketplaceDesign>();
      let loadedAtLeastOneCollection = false;
      let permissionDeniedCount = 0;

      for (const collectionName of DIGITAL_DESIGNS_COLLECTION_CANDIDATES) {
        try {
          const snapshot = await getDocs(collection(firestore, collectionName));
          const sortedDocs = [...snapshot.docs].sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a));
          loadedAtLeastOneCollection = true;

          for (const doc of sortedDocs) {
            uniqueDesigns.set(`${collectionName}:${doc.id}`, mapFirestoreDocToMarketplaceDesign(doc, collectionName));
          }
        } catch (error) {
          const code =
            typeof error === "object" && error !== null && "code" in error
              ? String((error as { code?: unknown }).code)
              : "";

          if (code === "permission-denied" || code === "firestore/permission-denied") {
            permissionDeniedCount += 1;
            continue;
          }

          throw error;
        }
      }

      if (!loadedAtLeastOneCollection && permissionDeniedCount === DIGITAL_DESIGNS_COLLECTION_CANDIDATES.length) {
        throw new Error("Missing or insufficient permissions.");
      }

      setDesigns(Array.from(uniqueDesigns.values()));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load digital designs.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDigitalDesigns();
  }, [loadDigitalDesigns]);

  useEffect(() => {
    const urls = designs
      .map((design) => design.thumbnailUrl ?? design.fullImageUrl ?? design.imageUrl)
      .filter((url): url is string => Boolean(url));

    if (urls.length > 0) {
      void ExpoImage.prefetch(urls, "memory-disk");
    }
  }, [designs]);

  if (isLoading && designs.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#93C5FD" size="large" />
        <Text style={styles.loadingText}>Loading digital designs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <FlatList
        data={designs}
        numColumns={2}
        keyExtractor={(item) => `${item.sourceCollection}:${item.sourceDocId}`}
        renderItem={({ item }) => (
          <View style={styles.cardColumn}>
            <Link
              href={{
                pathname: "/digital-design/[designId]",
                params: {
                  designId: item.sourceDocId,
                  collection: item.sourceCollection,
                  documentId: item.documentId,
                  name: item.name,
                  description: item.description,
                  updatedAt: item.updatedAt,
                  thumbnailUrl: item.thumbnailUrl ?? "",
                  fullImageUrl: item.fullImageUrl ?? "",
                },
              }}
              asChild
            >
              <Pressable style={styles.cardPressable}>
                {LinkWithAppleZoom.AppleZoom ? (
                  <LinkWithAppleZoom.AppleZoom>
                    <DigitalDesignCard design={item} />
                  </LinkWithAppleZoom.AppleZoom>
                ) : (
                  <DigitalDesignCard design={item} />
                )}
              </Pressable>
            </Link>
          </View>
        )}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews={true}
        contentContainerStyle={[
          designs.length === 0 ? styles.emptyListContentContainer : styles.listContentContainer,
          listBottomInset != null ? { paddingBottom: listBottomInset } : null,
        ]}
        columnWrapperStyle={designs.length > 0 ? styles.columnWrapper : undefined}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void loadDigitalDesigns(true);
            }}
            tintColor="#93C5FD"
          />
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No digital designs found yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#111827",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
    backgroundColor: "#111827",
  },
  loadingText: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 12,
    marginHorizontal: 16,
  },
  listContentContainer: {
    paddingHorizontal: 10,
    paddingVertical: 16,
  },
  columnWrapper: {
    justifyContent: "space-between",
    paddingHorizontal: 6,
  },
  cardColumn: {
    flexBasis: "48%",
    maxWidth: "48%",
    marginBottom: 12,
  },
  cardPressable: {
    borderRadius: 12,
  } satisfies ViewStyle,
  emptyListContentContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    color: "#CBD5E1",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
