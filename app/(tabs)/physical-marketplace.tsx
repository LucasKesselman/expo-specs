import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Link } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
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

import { PhysicalDesignCard } from "../../components/marketplace/PhysicalDesignCard";
import { firestore } from "../../lib/firebase";
import { mapFirestoreDocToMarketplaceDesign, type MarketplaceDesign } from "../../types/marketplaceDesign";

const PHYSICAL_DESIGNS_COLLECTION_CANDIDATES = ["PhysicalDesigns"] as const;
const FALLBACK_TAB_BAR_HEIGHT = 56;
const FALLBACK_ACCESSORY_HEIGHT = 70;
const FALLBACK_ACCESSORY_SPACING = 16;
type AppleZoomLink = typeof Link & {
  AppleZoom?: ComponentType<{ children: ReactNode }>;
};
const LinkWithAppleZoom = Link as AppleZoomLink;

function getSortTimestamp(doc: QueryDocumentSnapshot<DocumentData>): number {
  const data = doc.data();
  const candidates = [data.lastUpdatedAt, data.createdAt];

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

export default function PhysicalMarketplaceTabScreen() {
  const insets = useSafeAreaInsets();
  const [designs, setDesigns] = useState<MarketplaceDesign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loadingSpin = useRef(new Animated.Value(0)).current;
  const listTopInset = Platform.OS === "ios" ? insets.top + 16 : 16;
  const listBottomInset =
    Platform.OS === "ios"
      ? undefined
      : FALLBACK_TAB_BAR_HEIGHT + FALLBACK_ACCESSORY_HEIGHT + FALLBACK_ACCESSORY_SPACING + insets.bottom;

  const loadPhysicalDesigns = useCallback(async (refresh = false) => {
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

      for (const collectionName of PHYSICAL_DESIGNS_COLLECTION_CANDIDATES) {
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

      if (!loadedAtLeastOneCollection && permissionDeniedCount === PHYSICAL_DESIGNS_COLLECTION_CANDIDATES.length) {
        throw new Error("Missing or insufficient permissions.");
      }

      setDesigns(Array.from(uniqueDesigns.values()));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load physical designs.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadPhysicalDesigns();
  }, [loadPhysicalDesigns]);

  useEffect(() => {
    const urls = designs
      .map((design) => design.thumbnailUrl ?? design.fullImageUrl ?? design.imageUrl)
      .filter((url): url is string => Boolean(url));

    if (urls.length > 0) {
      void ExpoImage.prefetch(urls, "memory-disk");
    }
  }, [designs]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(loadingSpin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      loadingSpin.setValue(0);
    };
  }, [loadingSpin]);

  if (isLoading && designs.length === 0) {
    const rotate = loadingSpin.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });

    return (
      <View style={styles.loadingContainer}>
        <Animated.Image
          source={require("../../assets/artie-assets/UIStuff/ArtieSymbolWhite.png")}
          style={[styles.loadingBrand, { transform: [{ rotate }] }]}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <FlatList
        style={styles.list}
        data={designs}
        numColumns={2}
        keyExtractor={(item) => `${item.sourceCollection}:${item.sourceDocId}`}
        renderItem={({ item }) => (
          <View style={styles.cardColumn}>
            <Link
              href={{
                pathname: "/physical-design/[designId]",
                params: {
                  designId: item.sourceDocId,
                  collection: item.sourceCollection,
                  documentId: item.documentId,
                  name: item.name,
                  description: item.description,
                  updatedAt: item.updatedAt,
                  miniImageUrl: item.miniImageUrl ?? "",
                  thumbnailUrl: item.thumbnailUrl ?? "",
                  fullImageUrl: item.fullImageUrl ?? "",
                },
              }}
              asChild
            >
              <Pressable style={styles.cardPressable}>
                {LinkWithAppleZoom.AppleZoom ? (
                  <LinkWithAppleZoom.AppleZoom>
                    <PhysicalDesignCard design={item} />
                  </LinkWithAppleZoom.AppleZoom>
                ) : (
                  <PhysicalDesignCard design={item} />
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
          { paddingTop: listTopInset },
          listBottomInset != null ? { paddingBottom: listBottomInset } : null,
        ]}
        columnWrapperStyle={designs.length > 0 ? styles.columnWrapper : undefined}
        ListHeaderComponent={
          isRefreshing ? (
            <View style={styles.refreshIndicatorContainer}>
              <ActivityIndicator size="small" color="#93C5FD" />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void loadPhysicalDesigns(true);
            }}
            tintColor="#93C5FD"
            colors={["#93C5FD"]}
            progressBackgroundColor="#111827"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyStateContainer}>
            <Image
              source={require("../../assets/artie-assets/UIStuff/artieiconB.png")}
              style={styles.emptyStateIcon}
              resizeMode="contain"
            />
            <Text style={styles.emptyText}>No physical designs found yet.</Text>
          </View>
        }
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
  loadingBrand: {
    width: 76,
    height: 76,
    opacity: 0.9,
    marginBottom: 4,
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
  list: {
    flex: 1,
    width: "100%",
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
  refreshIndicatorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 8,
  },
  emptyListContentContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateIcon: {
    width: 66,
    height: 72,
    opacity: 0.92,
    marginBottom: 10,
  },
  emptyText: {
    color: "#CBD5E1",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
