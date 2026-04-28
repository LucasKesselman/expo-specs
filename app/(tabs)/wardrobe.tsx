import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { collection, doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { firestore } from "../../lib/firebase";

const FALLBACK_TAB_BAR_HEIGHT = 56;
const FALLBACK_ACCESSORY_HEIGHT = 70;
const FALLBACK_ACCESSORY_SPACING = 16;
const USERS_COLLECTION = "Users";
const GARMENTS_COLLECTION = "Garments";

type GarmentCardData = {
  id: string;
  garmentPath: string | null;
  size: string;
  color: string;
  printStatus: string;
  qrCodeStatus: string;
  physicalDesignId: string | null;
  digitalDesignId: string | null;
};

type OwnedGarmentReference = {
  garmentId: string;
  garmentPath?: string;
};

function normalizeOwnedGarmentReference(
  value: unknown,
): OwnedGarmentReference | null {
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    const segments = trimmed.split("/").filter(Boolean);
    const garmentId = segments.length ? segments[segments.length - 1] : trimmed;
    const garmentPath = trimmed.includes("/") ? trimmed : undefined;
    return { garmentId, garmentPath };
  }

  if (typeof value === "object" && value !== null) {
    if ("id" in value && typeof (value as { id?: unknown }).id === "string") {
      const garmentId = ((value as { id: string }).id || "").trim();
      if (!garmentId) {
        return null;
      }

      const garmentPath =
        "path" in value && typeof (value as { path?: unknown }).path === "string"
          ? (value as { path: string }).path.trim() || undefined
          : undefined;

      return { garmentId, garmentPath };
    }

    if (
      "path" in value &&
      typeof (value as { path?: unknown }).path === "string"
    ) {
      const path = (value as { path: string }).path.trim();
      if (!path) {
        return null;
      }
      const segments = path.split("/").filter(Boolean);
      if (!segments.length) {
        return null;
      }

      return {
        garmentId: segments[segments.length - 1],
        garmentPath: path,
      };
    }
  }

  return null;
}

function normalizeLinkedDocumentId(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    const segments = value.split("/").filter(Boolean);
    return segments.length ? segments[segments.length - 1] : value.trim();
  }

  if (typeof value === "object" && value !== null && "id" in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string" && id.trim()) {
      return id.trim();
    }
  }

  return null;
}

export default function WardrobeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [isLoadingGarments, setIsLoadingGarments] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ownedGarments, setOwnedGarments] = useState<GarmentCardData[]>([]);
  const [garmentsErrorMessage, setGarmentsErrorMessage] = useState<
    string | null
  >(null);
  const listTopInset = Platform.OS === "ios" ? insets.top + 16 : 16;
  const listBottomInset =
    Platform.OS === "ios"
      ? undefined
      : FALLBACK_TAB_BAR_HEIGHT +
        FALLBACK_ACCESSORY_HEIGHT +
        FALLBACK_ACCESSORY_SPACING +
        insets.bottom;

  const loadOwnedGarments = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoadingGarments(true);
      }

      if (!user) {
        setOwnedGarments([]);
        setGarmentsErrorMessage(null);
        setIsLoadingGarments(false);
        setIsRefreshing(false);
        return;
      }

      setGarmentsErrorMessage(null);

      try {
        const userRef = doc(collection(firestore, USERS_COLLECTION), user.uid);
        const userSnapshot = await getDoc(userRef);

        if (!userSnapshot.exists()) {
          setOwnedGarments([]);
          return;
        }

        const userData = userSnapshot.data();
        const rawOwnedGarments = Array.isArray(userData.ownedGarments)
          ? userData.ownedGarments
          : [];
        const ownedGarmentReferences = Array.from(
          rawOwnedGarments
            .map(normalizeOwnedGarmentReference)
            .filter(
              (
                reference,
              ): reference is OwnedGarmentReference => reference !== null,
            )
            .reduce((acc, reference) => {
              const dedupeKey = reference.garmentPath ?? reference.garmentId;
              if (!acc.has(dedupeKey)) {
                acc.set(dedupeKey, reference);
              }
              return acc;
            }, new Map<string, OwnedGarmentReference>())
            .values(),
        );

        if (!ownedGarmentReferences.length) {
          setOwnedGarments([]);
          return;
        }

        const garmentSnapshots = await Promise.all(
          ownedGarmentReferences.map(async ({ garmentId, garmentPath }) => {
            try {
              if (garmentPath) {
                const pathSnapshot = await getDoc(doc(firestore, garmentPath));
                if (pathSnapshot.exists()) {
                  return { garmentId, snapshot: pathSnapshot };
                }
              }

              const fallbackSnapshot = await getDoc(
                doc(collection(firestore, GARMENTS_COLLECTION), garmentId),
              );
              return { garmentId, snapshot: fallbackSnapshot };
            } catch {
              return { garmentId, snapshot: null };
            }
          }),
        );

        const garmentCards = garmentSnapshots.map(({ garmentId, snapshot }) => {
          if (!snapshot || !snapshot.exists()) {
            return {
              id: garmentId,
              garmentPath: null,
              size: "Unknown",
              color: "Unknown",
              printStatus: "Unavailable",
              qrCodeStatus: "Unavailable",
              physicalDesignId: null,
              digitalDesignId: null,
            };
          }

          const garmentData = snapshot.data();
          return {
            id: garmentId,
            garmentPath: snapshot.ref.path,
            size:
              typeof garmentData.size === "string"
                ? garmentData.size
                : "Unknown",
            color:
              typeof garmentData.color === "string"
                ? garmentData.color
                : "Unknown",
            printStatus:
              typeof garmentData.printStatus === "string"
                ? garmentData.printStatus
                : "Unknown",
            qrCodeStatus:
              typeof garmentData.qrCodeStatus === "string"
                ? garmentData.qrCodeStatus
                : "Unknown",
            physicalDesignId: normalizeLinkedDocumentId(
              garmentData.physicalDesign,
            ),
            digitalDesignId: normalizeLinkedDocumentId(
              garmentData.digitalDesign,
            ),
          };
        });

        setOwnedGarments(garmentCards);
      } catch {
        setOwnedGarments([]);
        setGarmentsErrorMessage("We couldn't load your garments right now.");
      } finally {
        setIsLoadingGarments(false);
        setIsRefreshing(false);
      }
    },
    [user],
  );

  useEffect(() => {
    void loadOwnedGarments();
  }, [loadOwnedGarments]);

  const emptyMessage = !user
    ? "Sign in to view your garments."
    : isLoadingGarments
      ? "Loading your garments..."
      : garmentsErrorMessage ?? "No garments found on your account yet.";

  return (
    <View style={styles.screenContainer}>
      {garmentsErrorMessage && ownedGarments.length > 0 ? (
        <Text style={styles.errorText}>{garmentsErrorMessage}</Text>
      ) : null}
      <FlatList
        style={styles.list}
        data={ownedGarments}
        numColumns={2}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardColumn}>
            <Pressable
              style={({ pressed }) => [
                styles.garmentCard,
                pressed ? styles.garmentCardPressed : null,
              ]}
              onPress={() => {
                router.push({
                  pathname: "/garment/[garmentId]",
                  params: {
                    garmentId: item.id,
                    garmentPath: item.garmentPath ?? "",
                    size: item.size,
                    color: item.color,
                    printStatus: item.printStatus,
                    qrCodeStatus: item.qrCodeStatus,
                    physicalDesignId: item.physicalDesignId ?? "",
                    digitalDesignId: item.digitalDesignId ?? "",
                  },
                });
              }}
            >
              <View style={styles.garmentCardHeader}>
                <Ionicons name="shirt-outline" size={20} color="#BFDBFE" />
                <Text numberOfLines={1} style={styles.garmentCardId}>
                  {item.id}
                </Text>
              </View>

              <View style={styles.garmentCardBody}>
                <Text style={styles.garmentCardLabel}>Size</Text>
                <Text style={styles.garmentCardValue}>{item.size}</Text>

                <Text style={styles.garmentCardLabel}>Color</Text>
                <Text style={styles.garmentCardValue}>{item.color}</Text>

                <Text style={styles.garmentCardLabel}>Print Status</Text>
                <Text style={styles.garmentCardValue}>{item.printStatus}</Text>

                <Text style={styles.garmentCardLabel}>QR Status</Text>
                <Text style={styles.garmentCardValue}>{item.qrCodeStatus}</Text>

                {item.physicalDesignId ? (
                  <>
                    <Text style={styles.garmentCardLabel}>Physical Design</Text>
                    <Text numberOfLines={1} style={styles.garmentCardValue}>
                      {item.physicalDesignId}
                    </Text>
                  </>
                ) : null}

                {item.digitalDesignId ? (
                  <>
                    <Text style={styles.garmentCardLabel}>Digital Design</Text>
                    <Text numberOfLines={1} style={styles.garmentCardValue}>
                      {item.digitalDesignId}
                    </Text>
                  </>
                ) : null}
              </View>
            </Pressable>
          </View>
        )}
        contentContainerStyle={[
          ownedGarments.length === 0
            ? styles.emptyListContentContainer
            : styles.listContentContainer,
          { paddingTop: listTopInset },
          listBottomInset != null ? { paddingBottom: listBottomInset } : null,
        ]}
        columnWrapperStyle={ownedGarments.length > 0 ? styles.columnWrapper : undefined}
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
              void loadOwnedGarments(true);
            }}
            tintColor="#93C5FD"
            colors={["#93C5FD"]}
            progressBackgroundColor="#111827"
          />
        }
        ListEmptyComponent={
          <View style={styles.stateCard}>
            <Text style={styles.stateMessage}>{emptyMessage}</Text>
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
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 12,
    marginHorizontal: 16,
  },
  list: {
    flex: 1,
    width: "100%",
  },
  listContentContainer: {
    paddingHorizontal: 10,
    paddingVertical: 16,
  },
  emptyListContentContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
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
  refreshIndicatorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 8,
  },
  stateCard: {
    backgroundColor: "#1F2937",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#374151",
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: "100%",
    maxWidth: 360,
  },
  stateMessage: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center",
  },
  garmentCard: {
    aspectRatio: 9 / 16,
    backgroundColor: "#1F2937",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#374151",
    padding: 12,
  },
  garmentCardPressed: {
    opacity: 0.82,
  },
  garmentCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  garmentCardId: {
    flex: 1,
    color: "#F9FAFB",
    fontSize: 12,
    fontWeight: "700",
  },
  garmentCardBody: {
    flex: 1,
  },
  garmentCardLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 8,
  },
  garmentCardValue: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
});
