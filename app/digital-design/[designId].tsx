import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { httpsCallable } from "firebase/functions";
import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

import { useAuth } from "../../contexts/AuthContext";
import { firestore, functions } from "../../lib/firebase";
import { dedupeOwnedGarmentReferences } from "../../lib/ownedGarments";
import {
  buildSavedDigitalDesignRemoveValues,
  isDesignInSavedList,
} from "../../lib/savedDigitalDesigns";
import { mapFirestoreDocToMarketplaceDesign, type MarketplaceDesign } from "../../types/marketplaceDesign";

const DIGITAL_DESIGNS_COLLECTION_CANDIDATES = ["DigitalDesigns"] as const;
const USERS_COLLECTION = "Users";
const GARMENTS_COLLECTION = "Garments";
const CARD_WIDTH = 160;

type OwnedGarmentCard = {
  id: string;
  size: string;
  color: string;
  printStatus: string;
  qrCodeStatus: string;
  physicalDesignId: string | null;
  digitalDesignId: string | null;
};

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

function getInitialDesignFromParams(
  params: ReturnType<typeof useLocalSearchParams>,
): MarketplaceDesign | null {
  const designId = getParamAsString(params.designId);

  if (!designId) {
    return null;
  }

  const documentId = getParamAsString(params.documentId);
  const name = getParamAsString(params.name);
  const description = getParamAsString(params.description);
  const updatedAt = getParamAsString(params.updatedAt);
  const miniImageUrl = getParamAsString(params.miniImageUrl);
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
    priceAmount: 0,
    tags: [],
    version: "",
    miniImageUrl: miniImageUrl || null,
    thumbnailUrl: thumbnailUrl || null,
    fullImageUrl: fullImageUrl || null,
    imageUrl: fullImageUrl || thumbnailUrl || null,
    createdAt: "N/A",
    marketplaceStatus: null,
    author: null,
    authorFullName: getParamAsString(params.authorFullName) || null,
  };
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

function getAppleZoomTarget(): ComponentType<{ children: ReactNode }> | null {
  try {
    const linkModule = require("expo-router") as LinkAppleZoomTargetModule;
    return linkModule.AppleZoomTarget ?? null;
  } catch {
    return null;
  }
}

export default function DigitalDesignDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const designId = getParamAsString(params.designId);
  const initialDesign = useMemo(() => getInitialDesignFromParams(params), [params]);
  const [design, setDesign] = useState<MarketplaceDesign | null>(initialDesign);
  const [isHydrating, setIsHydrating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isInWardrobe, setIsInWardrobe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAddToGarmentVisible, setIsAddToGarmentVisible] = useState(false);
  const [ownedGarmentCards, setOwnedGarmentCards] = useState<OwnedGarmentCard[]>([]);
  const [isLoadingOwnedGarments, setIsLoadingOwnedGarments] = useState(false);
  const [selectedGarmentId, setSelectedGarmentId] = useState<string | null>(null);
  const [isAssigningGarment, setIsAssigningGarment] = useState(false);
  const [addToGarmentError, setAddToGarmentError] = useState<string | null>(null);
  const AppleZoomTarget = useMemo(() => getAppleZoomTarget(), []);

  const refreshSavedMembership = useCallback(async () => {
    if (!user?.uid || !designId) {
      setIsInWardrobe(false);
      return;
    }

    try {
      const userSnapshot = await getDoc(doc(firestore, USERS_COLLECTION, user.uid));
      const savedDigitalDesigns = userSnapshot.exists()
        ? userSnapshot.data().savedDigitalDesigns
        : [];
      setIsInWardrobe(isDesignInSavedList(savedDigitalDesigns, designId));
    } catch {
      setIsInWardrobe(false);
    }
  }, [designId, user?.uid]);

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
        ? [
            preferredCollection,
            ...DIGITAL_DESIGNS_COLLECTION_CANDIDATES.filter(
              (name) => name !== preferredCollection,
            ),
          ]
        : [...DIGITAL_DESIGNS_COLLECTION_CANDIDATES];

      try {
        for (const collectionName of candidates) {
          try {
            const snapshot = await getDoc(
              doc(collection(firestore, collectionName), designId),
            );
            if (!snapshot.exists()) {
              continue;
            }

            if (isMounted) {
              setDesign(mapFirestoreDocToMarketplaceDesign(snapshot, collectionName));
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
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load design details.",
          );
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

  useEffect(() => {
    void refreshSavedMembership();
  }, [refreshSavedMembership]);

  const displayImageUrl =
    design?.fullImageUrl ?? design?.thumbnailUrl ?? design?.imageUrl ?? null;
  const isPublic = design?.marketplaceStatus === "PUBLIC";
  const priceAmount = design?.priceAmount ?? 0;

  const handlePrimaryAction = async () => {
    if (!design || !isPublic) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    if (priceAmount > 0) {
      Alert.alert("Error", "not released. yet");
      return;
    }

    if (!user?.uid) {
      router.push("/(auth)/landing");
      return;
    }

    if (isInWardrobe) {
      setSuccessMessage("Already in wardrobe.");
      return;
    }

    setIsSaving(true);
    try {
      await updateDoc(doc(firestore, USERS_COLLECTION, user.uid), {
        id: user.uid,
        savedDigitalDesigns: arrayUnion(design.sourceDocId),
      });
      setIsInWardrobe(true);
      setSuccessMessage("Design saved to your wardrobe.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save design to wardrobe.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveFromWardrobe = () => {
    if (!user?.uid || !design || !isInWardrobe) {
      return;
    }

    const statusNote =
      design.marketplaceStatus === "PRIVATE"
        ? "You will need to re-upload this design to add it again."
        : "You will need to re-purchase this design to add it again.";

    Alert.alert(
      "Remove from Wardrobe",
      `Removing this design from your wardrobe will require either a re-upload if PRIVATE or a re-purchase if PUBLIC. ${statusNote}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setIsRemoving(true);
              setErrorMessage(null);
              setSuccessMessage(null);
              try {
                const removeValues = buildSavedDigitalDesignRemoveValues(design.sourceDocId);
                await updateDoc(doc(firestore, USERS_COLLECTION, user.uid), {
                  id: user.uid,
                  savedDigitalDesigns: arrayRemove(...removeValues),
                });
                setIsInWardrobe(false);
                setSuccessMessage("Design removed from your wardrobe.");
              } catch (error) {
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "Unable to remove design from wardrobe.",
                );
              } finally {
                setIsRemoving(false);
              }
            })();
          },
        },
      ],
    );
  };

  const openAddToGarmentModal = useCallback(async () => {
    if (!user?.uid) {
      router.push("/(auth)/landing");
      return;
    }

    setIsAddToGarmentVisible(true);
    setSelectedGarmentId(null);
    setAddToGarmentError(null);
    setIsLoadingOwnedGarments(true);

    try {
      const userSnapshot = await getDoc(doc(firestore, USERS_COLLECTION, user.uid));
      const refs = dedupeOwnedGarmentReferences(
        userSnapshot.exists() ? userSnapshot.data().ownedGarments : [],
      );

      if (!refs.length) {
        setOwnedGarmentCards([]);
        return;
      }

      const snapshots = await Promise.all(
        refs.map(async ({ garmentId, garmentPath }) => {
          try {
            if (garmentPath) {
              const pathSnapshot = await getDoc(doc(firestore, garmentPath));
              if (pathSnapshot.exists()) {
                return { garmentId, snapshot: pathSnapshot };
              }
            }
            const fallback = await getDoc(
              doc(collection(firestore, GARMENTS_COLLECTION), garmentId),
            );
            return { garmentId, snapshot: fallback };
          } catch {
            return { garmentId, snapshot: null };
          }
        }),
      );

      setOwnedGarmentCards(
        snapshots.map(({ garmentId, snapshot }) => {
          if (!snapshot || !snapshot.exists()) {
            return {
              id: garmentId,
              size: "Unknown",
              color: "Unknown",
              printStatus: "Unavailable",
              qrCodeStatus: "Unavailable",
              physicalDesignId: null,
              digitalDesignId: null,
            };
          }
          const data = snapshot.data();
          return {
            id: garmentId,
            size: typeof data.size === "string" ? data.size : "Unknown",
            color: typeof data.color === "string" ? data.color : "Unknown",
            printStatus:
              typeof data.printStatus === "string" ? data.printStatus : "Unknown",
            qrCodeStatus:
              typeof data.qrCodeStatus === "string" ? data.qrCodeStatus : "Unknown",
            physicalDesignId: normalizeLinkedDocumentId(data.physicalDesign),
            digitalDesignId: normalizeLinkedDocumentId(data.digitalDesign),
          };
        }),
      );
    } catch (error) {
      setOwnedGarmentCards([]);
      setAddToGarmentError(
        error instanceof Error ? error.message : "Unable to load owned garments.",
      );
    } finally {
      setIsLoadingOwnedGarments(false);
    }
  }, [router, user?.uid]);

  const handleConfirmAssignToGarment = async () => {
    if (!design || !selectedGarmentId || isAssigningGarment) {
      return;
    }

    setIsAssigningGarment(true);
    setAddToGarmentError(null);
    try {
      const assignDigitalDesignToGarment = httpsCallable<
        { garmentId: string; digitalDesignId: string },
        { garmentId: string; digitalDesignId: string }
      >(functions, "assignDigitalDesignToGarment");

      await assignDigitalDesignToGarment({
        garmentId: selectedGarmentId,
        digitalDesignId: design.sourceDocId,
      });

      setIsAddToGarmentVisible(false);
      setSelectedGarmentId(null);
      setSuccessMessage(`Design assigned to garment ${selectedGarmentId}.`);
      setErrorMessage(null);
    } catch (error) {
      setAddToGarmentError(
        error instanceof Error ? error.message : "Failed to assign design to garment.",
      );
    } finally {
      setIsAssigningGarment(false);
    }
  };

  const primaryButtonLabel =
    priceAmount > 0 ? "Buy Design" : isSaving ? "Saving..." : "Save Design";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {AppleZoomTarget ? (
        <AppleZoomTarget>
          <View style={styles.heroContainer}>
            {displayImageUrl ? (
              <Image
                source={{ uri: displayImageUrl }}
                style={styles.heroImage}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
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
            <Image
              source={{ uri: displayImageUrl }}
              style={styles.heroImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.heroFallback}>
              <Text style={styles.heroFallbackText}>No preview image</Text>
            </View>
          )}
        </View>
      )}

      {user && isInWardrobe ? (
        <Pressable
          onPress={() => {
            void openAddToGarmentModal();
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryButtonPressed : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>Add to Garment</Text>
        </Pressable>
      ) : null}

      {isPublic ? (
        <Pressable
          onPress={() => {
            void handlePrimaryAction();
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryButtonPressed : null,
            isSaving ? styles.primaryButtonDisabled : null,
          ]}
          disabled={!design || isSaving}
        >
          <Text style={styles.primaryButtonText}>{primaryButtonLabel}</Text>
        </Pressable>
      ) : null}

      <Text style={styles.title}>{design?.name ?? "Untitled design"}</Text>
      <Text style={styles.description}>
        {design?.description ?? "No description provided."}
      </Text>

      <View style={styles.metaContainer}>
        <Text style={styles.metaLabel}>Name</Text>
        <Text style={styles.metaValue}>{design?.name ?? "Untitled design"}</Text>
      </View>
      <View style={styles.metaContainer}>
        <Text style={styles.metaLabel}>Author's Name</Text>
        <Text style={styles.metaValue}>{design?.authorFullName ?? "N/A"}</Text>
      </View>
      <View style={styles.metaContainer}>
        <Text style={styles.metaLabel}>Description</Text>
        <Text style={styles.metaValue}>
          {design?.description ?? "No description provided."}
        </Text>
      </View>
      <View style={styles.metaContainer}>
        <Text style={styles.metaLabel}>Last Updated</Text>
        <Text style={styles.metaValue}>{design?.updatedAt ?? "N/A"}</Text>
      </View>

      {isPublic ? (
        <>
          <View style={styles.metaContainer}>
            <Text style={styles.metaLabel}>Price</Text>
            <Text style={styles.metaValue}>{design?.price ?? "N/A"}</Text>
          </View>
          <View style={styles.metaContainer}>
            <Text style={styles.metaLabel}>Tags</Text>
            <Text style={styles.metaValue}>
              {design?.tags?.length ? design.tags.join(", ") : "None"}
            </Text>
          </View>
          <View style={styles.metaContainer}>
            <Text style={styles.metaLabel}>Version</Text>
            <Text style={styles.metaValue}>
              {design?.version?.trim() ? design.version : "N/A"}
            </Text>
          </View>
        </>
      ) : null}

      {isHydrating ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#93C5FD" />
          <Text style={styles.loadingText}>Refreshing design details...</Text>
        </View>
      ) : null}
      {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {user && isInWardrobe ? (
        <Pressable
          onPress={handleRemoveFromWardrobe}
          style={({ pressed }) => [
            styles.removeButton,
            pressed ? styles.removeButtonPressed : null,
            isRemoving ? styles.primaryButtonDisabled : null,
          ]}
          disabled={isRemoving}
        >
          <Text style={styles.removeButtonText}>
            {isRemoving ? "Removing..." : "Remove from Wardrobe"}
          </Text>
        </Pressable>
      ) : null}

      <Modal
        visible={isAddToGarmentVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!isAssigningGarment) {
            setIsAddToGarmentVisible(false);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add to Garment</Text>
            <Text style={styles.modalDescription}>
              Select one of your owned garments, then confirm.
            </Text>

            {isLoadingOwnedGarments ? (
              <View style={styles.modalLoadingRow}>
                <ActivityIndicator color="#93C5FD" />
                <Text style={styles.loadingText}>Loading garments...</Text>
              </View>
            ) : ownedGarmentCards.length === 0 ? (
              <Text style={styles.modalEmptyText}>No owned garments yet.</Text>
            ) : (
              <FlatList
                horizontal
                data={ownedGarmentCards}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContent}
                style={styles.carousel}
                renderItem={({ item }) => {
                  const isSelected = selectedGarmentId === item.id;
                  return (
                    <Pressable
                      onPress={() => setSelectedGarmentId(item.id)}
                      style={[
                        styles.garmentCard,
                        isSelected ? styles.garmentCardSelected : null,
                      ]}
                    >
                      <Text numberOfLines={1} style={styles.garmentCardId}>
                        {item.id}
                      </Text>
                      <Text style={styles.garmentCardLabel}>Size</Text>
                      <Text style={styles.garmentCardValue}>{item.size}</Text>
                      <Text style={styles.garmentCardLabel}>Color</Text>
                      <Text style={styles.garmentCardValue}>{item.color}</Text>
                      <Text style={styles.garmentCardLabel}>Print Status</Text>
                      <Text style={styles.garmentCardValue}>{item.printStatus}</Text>
                      <Text style={styles.garmentCardLabel}>QR Status</Text>
                      <Text style={styles.garmentCardValue}>{item.qrCodeStatus}</Text>
                    </Pressable>
                  );
                }}
              />
            )}

            {addToGarmentError ? (
              <Text style={styles.errorText}>{addToGarmentError}</Text>
            ) : null}

            <Pressable
              onPress={() => {
                void handleConfirmAssignToGarment();
              }}
              disabled={!selectedGarmentId || isAssigningGarment || isLoadingOwnedGarments}
              style={({ pressed }) => [
                styles.modalConfirmButton,
                pressed && selectedGarmentId ? styles.primaryButtonPressed : null,
                !selectedGarmentId || isAssigningGarment || isLoadingOwnedGarments
                  ? styles.primaryButtonDisabled
                  : null,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {isAssigningGarment ? "Assigning..." : "Confirm"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!isAssigningGarment) {
                  setIsAddToGarmentVisible(false);
                  setAddToGarmentError(null);
                }
              }}
              style={({ pressed }) => [
                styles.modalCloseButton,
                pressed ? styles.primaryButtonPressed : null,
              ]}
              disabled={isAssigningGarment}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  primaryButton: {
    marginTop: 16,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
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
  successText: {
    color: "#86EFAC",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
  },
  removeButton: {
    marginTop: 24,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  removeButtonPressed: {
    opacity: 0.9,
  },
  removeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.7)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#111827",
    padding: 16,
    maxHeight: "80%",
  },
  modalTitle: {
    color: "#F9FAFB",
    fontSize: 18,
    fontWeight: "800",
  },
  modalDescription: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    marginTop: 8,
  },
  modalLoadingRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalEmptyText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 14,
  },
  carousel: {
    marginTop: 14,
    maxHeight: 280,
  },
  carouselContent: {
    gap: 10,
    paddingVertical: 4,
  },
  garmentCard: {
    width: CARD_WIDTH,
    aspectRatio: 9 / 16,
    backgroundColor: "#1F2937",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#374151",
    padding: 12,
  },
  garmentCardSelected: {
    borderColor: "#60A5FA",
    backgroundColor: "#1E3A8A",
  },
  garmentCardId: {
    color: "#F9FAFB",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
  },
  garmentCardLabel: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 6,
  },
  garmentCardValue: {
    color: "#E5E7EB",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  modalConfirmButton: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseButton: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#374151",
    backgroundColor: "#030712",
    paddingVertical: 10,
    alignItems: "center",
  },
  modalCloseButtonText: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "700",
  },
});
