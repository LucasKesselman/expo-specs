import { useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { httpsCallable } from "firebase/functions";
import { collection, doc, getDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { DigitalDesignCard } from "../../components/marketplace/DigitalDesignCard";
import { useAuth } from "../../contexts/AuthContext";
import { firestore, functions } from "../../lib/firebase";
import { dedupeSavedDigitalDesignReferences } from "../../lib/savedDigitalDesigns";
import {
  mapFirestoreDocToMarketplaceDesign,
  type MarketplaceDesign,
} from "../../types/marketplaceDesign";

const GARMENTS_COLLECTION = "Garments";
const USERS_COLLECTION = "Users";
const DIGITAL_DESIGNS_COLLECTION = "DigitalDesigns";
const PHYSICAL_DESIGNS_COLLECTION = "PhysicalDesigns";
const DESIGN_CARD_WIDTH = 180;

type GarmentDetails = {
  id: string;
  garmentPath: string;
  size: string;
  color: string;
  version: string;
  verificationStatus: string;
  physicalDesignId: string | null;
  physicalDesignPath: string | null;
  digitalDesignId: string | null;
  digitalDesignPath: string | null;
  digitalDesignName: string | null;
  physicalDesignImageUrl: string | null;
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

function normalizeLinkedDocumentPath(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "object" && value !== null && "path" in value) {
    const path = (value as { path?: unknown }).path;
    if (typeof path === "string" && path.trim()) {
      return path.trim();
    }
  }

  return null;
}

function firstValidImageUrl(candidates: unknown[]): string | null {
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function mapSnapshotToGarmentDetails(
  garmentId: string,
  garmentPath: string,
  data: Record<string, unknown>,
): GarmentDetails {
  const digitalDesignPath = normalizeLinkedDocumentPath(data.digitalDesign);
  const digitalDesignId = normalizeLinkedDocumentId(data.digitalDesign);
  const physicalDesignPath = normalizeLinkedDocumentPath(data.physicalDesign);
  const physicalDesignId = normalizeLinkedDocumentId(data.physicalDesign);

  return {
    id: garmentId,
    garmentPath,
    size: typeof data.size === "string" ? data.size : "Unknown",
    color: typeof data.color === "string" ? data.color : "Unknown",
    version: typeof data.version === "string" && data.version.trim() ? data.version : "N/A",
    verificationStatus:
      typeof data.verificationStatus === "string"
        ? data.verificationStatus
        : "Unknown",
    physicalDesignId,
    physicalDesignPath:
      physicalDesignPath ||
      (physicalDesignId ? `${PHYSICAL_DESIGNS_COLLECTION}/${physicalDesignId}` : null),
    digitalDesignId,
    digitalDesignPath:
      digitalDesignPath ||
      (digitalDesignId ? `${DIGITAL_DESIGNS_COLLECTION}/${digitalDesignId}` : null),
    digitalDesignName: null,
    physicalDesignImageUrl: null,
  };
}

function getInitialGarmentFromParams(
  params: ReturnType<typeof useLocalSearchParams>,
): GarmentDetails | null {
  const garmentId = getParamAsString(params.garmentId);
  if (!garmentId) {
    return null;
  }

  const garmentPath =
    getParamAsString(params.garmentPath) || `${GARMENTS_COLLECTION}/${garmentId}`;
  const physicalDesignId = getParamAsString(params.physicalDesignId) || null;

  return {
    id: garmentId,
    garmentPath,
    size: getParamAsString(params.size) || "Unknown",
    color: getParamAsString(params.color) || "Unknown",
    version: getParamAsString(params.version) || "N/A",
    verificationStatus: getParamAsString(params.verificationStatus) || "Unknown",
    physicalDesignId,
    physicalDesignPath: physicalDesignId
      ? `${PHYSICAL_DESIGNS_COLLECTION}/${physicalDesignId}`
      : null,
    digitalDesignId: getParamAsString(params.digitalDesignId) || null,
    digitalDesignPath: getParamAsString(params.digitalDesignPath) || null,
    digitalDesignName: null,
    physicalDesignImageUrl: null,
  };
}

export default function GarmentDetailScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const garmentId = getParamAsString(params.garmentId);
  const initialGarment = useMemo(() => getInitialGarmentFromParams(params), [params]);
  const [garment, setGarment] = useState<GarmentDetails | null>(initialGarment);
  const [isHydrating, setIsHydrating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSelectDesignVisible, setIsSelectDesignVisible] = useState(false);
  const [savedDesigns, setSavedDesigns] = useState<MarketplaceDesign[]>([]);
  const [selectedDigitalDesignId, setSelectedDigitalDesignId] = useState<string | null>(null);
  const [isLoadingSavedDesigns, setIsLoadingSavedDesigns] = useState(false);
  const [isAssigningDesign, setIsAssigningDesign] = useState(false);
  const [selectDesignError, setSelectDesignError] = useState<string | null>(null);
  const [updateNotice, setUpdateNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!garmentId) {
      setErrorMessage("Missing garment ID.");
      return;
    }

    let isMounted = true;

    const hydrateGarment = async () => {
      setIsHydrating(true);
      setErrorMessage(null);

      const pathFromParams = getParamAsString(params.garmentPath).trim();
      const candidates = Array.from(
        new Set(
          [pathFromParams, `${GARMENTS_COLLECTION}/${garmentId}`].filter(
            (value): value is string => Boolean(value),
          ),
        ),
      );

      try {
        for (const garmentPath of candidates) {
          try {
            const snapshot = await getDoc(
              garmentPath.includes("/")
                ? doc(firestore, garmentPath)
                : doc(collection(firestore, GARMENTS_COLLECTION), garmentId),
            );

            if (!snapshot.exists()) {
              continue;
            }

            const mapped = mapSnapshotToGarmentDetails(
              garmentId,
              snapshot.ref.path,
              snapshot.data(),
            );

            let physicalDesignImageUrl: string | null = null;
            if (mapped.physicalDesignPath) {
              try {
                const physicalDesignSnapshot = await getDoc(
                  doc(firestore, mapped.physicalDesignPath),
                );
                if (physicalDesignSnapshot.exists()) {
                  const physicalDesignData = physicalDesignSnapshot.data();
                  // Prefer marketplaceFullImageUrl; fall back to processed card/thumbnail URLs.
                  physicalDesignImageUrl = firstValidImageUrl([
                    physicalDesignData.marketplaceFullImageUrl,
                    physicalDesignData.marketplaceCardImageURL,
                    physicalDesignData.marketplaceThumbnailImageURL,
                  ]);
                }
              } catch {
                physicalDesignImageUrl = null;
              }
            }

            let digitalDesignName: string | null = null;
            if (mapped.digitalDesignPath) {
              try {
                const digitalDesignSnapshot = await getDoc(
                  doc(firestore, mapped.digitalDesignPath),
                );
                if (digitalDesignSnapshot.exists()) {
                  const digitalDesignData = digitalDesignSnapshot.data();
                  digitalDesignName =
                    typeof digitalDesignData.name === "string" &&
                    digitalDesignData.name.trim()
                      ? digitalDesignData.name.trim()
                      : "Untitled design";
                }
              } catch {
                digitalDesignName = null;
              }
            }

            if (isMounted) {
              setGarment({
                ...mapped,
                physicalDesignImageUrl,
                digitalDesignName,
              });
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
            error instanceof Error ? error.message : "Unable to load garment details.",
          );
        }
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    };

    void hydrateGarment();

    return () => {
      isMounted = false;
    };
  }, [garmentId, params.garmentPath]);

  useEffect(() => {
    if (!isSelectDesignVisible) {
      return;
    }

    let isMounted = true;

    const loadSavedDigitalDesigns = async () => {
      if (!user) {
        if (isMounted) {
          setSavedDesigns([]);
          setSelectedDigitalDesignId(null);
          setSelectDesignError("Sign in to select a design.");
        }
        return;
      }

      if (isMounted) {
        setIsLoadingSavedDesigns(true);
        setSelectDesignError(null);
        setSelectedDigitalDesignId(null);
      }

      try {
        const userSnapshot = await getDoc(
          doc(collection(firestore, USERS_COLLECTION), user.uid),
        );
        const userData = userSnapshot.exists() ? userSnapshot.data() : {};
        const refs = dedupeSavedDigitalDesignReferences(userData.savedDigitalDesigns);

        const designSnapshots = await Promise.all(
          refs.map(async (ref) => {
            try {
              const snapshot = await getDoc(doc(firestore, ref.path));
              if (snapshot.exists()) {
                return snapshot;
              }
              return getDoc(doc(collection(firestore, DIGITAL_DESIGNS_COLLECTION), ref.id));
            } catch {
              return null;
            }
          }),
        );

        if (!isMounted) {
          return;
        }

        const designs = designSnapshots
          .filter((snapshot): snapshot is NonNullable<typeof snapshot> =>
            Boolean(snapshot?.exists()),
          )
          .map((snapshot) =>
            mapFirestoreDocToMarketplaceDesign(snapshot, DIGITAL_DESIGNS_COLLECTION),
          )
          .filter((design) => design.marketplaceStatus !== "INACTIVE");

        setSavedDesigns(designs);
        if (garment?.digitalDesignId) {
          const alreadyApplied = designs.some(
            (design) => design.sourceDocId === garment.digitalDesignId,
          );
          if (alreadyApplied) {
            setSelectedDigitalDesignId(garment.digitalDesignId);
          }
        }
      } catch (error) {
        if (isMounted) {
          setSavedDesigns([]);
          setSelectDesignError(
            error instanceof Error
              ? error.message
              : "Unable to load saved digital designs.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingSavedDesigns(false);
        }
      }
    };

    void loadSavedDigitalDesigns();

    return () => {
      isMounted = false;
    };
  }, [garment?.digitalDesignId, isSelectDesignVisible, user]);

  const handleConfirmSelectDesign = async () => {
    if (!garment || !selectedDigitalDesignId || isAssigningDesign) {
      return;
    }

    const selectedDesign = savedDesigns.find(
      (design) => design.sourceDocId === selectedDigitalDesignId,
    );
    if (!selectedDesign) {
      setSelectDesignError("Selected design is not available. Please choose again.");
      return;
    }

    setIsAssigningDesign(true);
    setSelectDesignError(null);
    setUpdateNotice(null);

    try {
      const assignDigitalDesignToGarment = httpsCallable<
        { garmentId: string; digitalDesignId: string },
        { garmentId: string; digitalDesignId: string }
      >(functions, "assignDigitalDesignToGarment");

      await assignDigitalDesignToGarment({
        garmentId: garment.id,
        digitalDesignId: selectedDesign.sourceDocId,
      });

      setGarment((previous) =>
        previous
          ? {
              ...previous,
              digitalDesignId: selectedDesign.sourceDocId,
              digitalDesignPath: `${DIGITAL_DESIGNS_COLLECTION}/${selectedDesign.sourceDocId}`,
              digitalDesignName: selectedDesign.name,
            }
          : previous,
      );
      setUpdateNotice(`Updated garment to design "${selectedDesign.name}".`);
      setIsSelectDesignVisible(false);
      setSelectedDigitalDesignId(null);
    } catch (error) {
      setSelectDesignError(
        error instanceof Error
          ? error.message
          : "Failed to update garment design.",
      );
    } finally {
      setIsAssigningDesign(false);
    }
  };

  const isSelectedDesignAlreadyApplied =
    Boolean(selectedDigitalDesignId) &&
    selectedDigitalDesignId === garment?.digitalDesignId;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroContainer}>
        {garment?.physicalDesignImageUrl ? (
          <Image
            source={{ uri: garment.physicalDesignImageUrl }}
            style={styles.heroImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.heroFallback}>
            <Text style={styles.heroFallbackText}>
              {isHydrating ? "Loading image..." : "No preview image"}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.selectedDesignLabel}>
        {garment?.digitalDesignName
          ? `Design: ${garment.digitalDesignName}`
          : "No digital design selected"}
      </Text>
      <Pressable
        onPress={() => {
          setIsSelectDesignVisible(true);
        }}
        style={({ pressed }) => [
          styles.editButton,
          pressed ? styles.editButtonPressed : null,
        ]}
      >
        <Text style={styles.editButtonText}>Select Design</Text>
      </Pressable>

      <Text style={styles.title}>Garment Details</Text>
      <Text style={styles.subtitle}>
        {garment?.id ?? garmentId ?? "Unknown garment"}
      </Text>

      <View style={styles.metaContainer}>
        <Text style={styles.metaLabel}>Version</Text>
        <Text style={styles.metaValue}>{garment?.version ?? "N/A"}</Text>
      </View>
      <View style={styles.metaContainer}>
        <Text style={styles.metaLabel}>Status</Text>
        <Text style={styles.metaValue}>
          {garment?.verificationStatus ?? "Unknown"}
        </Text>
      </View>
      <View style={styles.metaContainer}>
        <Text style={styles.metaLabel}>Color</Text>
        <Text style={styles.metaValue}>{garment?.color ?? "Unknown"}</Text>
      </View>
      <View style={styles.metaContainer}>
        <Text style={styles.metaLabel}>Size</Text>
        <Text style={styles.metaValue}>{garment?.size ?? "Unknown"}</Text>
      </View>
      {updateNotice ? <Text style={styles.successText}>{updateNotice}</Text> : null}

      {isHydrating ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#93C5FD" />
          <Text style={styles.loadingText}>Refreshing garment details...</Text>
        </View>
      ) : null}
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Modal
        visible={isSelectDesignVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!isAssigningDesign) {
            setIsSelectDesignVisible(false);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Design</Text>
            <Text style={styles.modalDescription}>
              Choose one saved digital design, then confirm.
            </Text>

            {isLoadingSavedDesigns ? (
              <View style={styles.modalLoadingRow}>
                <ActivityIndicator color="#93C5FD" />
                <Text style={styles.loadingText}>Loading saved designs...</Text>
              </View>
            ) : savedDesigns.length === 0 ? (
              <Text style={styles.modalEmptyText}>No saved digital designs yet.</Text>
            ) : (
              <FlatList
                horizontal
                data={savedDesigns}
                keyExtractor={(item) => item.sourceDocId}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContent}
                style={styles.carousel}
                renderItem={({ item }) => {
                  const isSelected = selectedDigitalDesignId === item.sourceDocId;
                  return (
                    <Pressable
                      onPress={() => setSelectedDigitalDesignId(item.sourceDocId)}
                      style={[
                        styles.designCardWrap,
                        isSelected ? styles.designCardWrapSelected : null,
                      ]}
                    >
                      <DigitalDesignCard design={item} />
                    </Pressable>
                  );
                }}
              />
            )}

            {selectDesignError ? (
              <Text style={styles.errorText}>{selectDesignError}</Text>
            ) : null}
            <Pressable
              onPress={() => {
                void handleConfirmSelectDesign();
              }}
              disabled={
                isLoadingSavedDesigns ||
                isAssigningDesign ||
                !selectedDigitalDesignId ||
                isSelectedDesignAlreadyApplied
              }
              style={({ pressed }) => [
                styles.modalSaveButton,
                pressed && !isAssigningDesign ? styles.modalSaveButtonPressed : null,
                isLoadingSavedDesigns ||
                isAssigningDesign ||
                !selectedDigitalDesignId ||
                isSelectedDesignAlreadyApplied
                  ? styles.modalSaveButtonDisabled
                  : null,
              ]}
            >
              <Text style={styles.modalSaveButtonText}>
                {isAssigningDesign
                  ? "Assigning..."
                  : isSelectedDesignAlreadyApplied
                    ? "Already Applied"
                    : "Confirm"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!isAssigningDesign) {
                  setIsSelectDesignVisible(false);
                  setSelectDesignError(null);
                }
              }}
              style={({ pressed }) => [
                styles.modalCloseButton,
                pressed ? styles.modalCloseButtonPressed : null,
              ]}
              disabled={isAssigningDesign}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={isAssigningDesign} transparent animationType="fade">
        <View style={styles.updatingBackdrop}>
          <View style={styles.updatingCard}>
            <ActivityIndicator size="large" color="#93C5FD" />
            <Text style={styles.updatingTitle}>Updating Garment</Text>
            <Text style={styles.updatingSubtitle}>
              Saving your selected digital design...
            </Text>
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
    marginBottom: 4,
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
    marginTop: 14,
  },
  subtitle: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
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
  selectedDesignLabel: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 18,
    textAlign: "center",
  },
  editButton: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonPressed: {
    opacity: 0.85,
  },
  editButtonText: {
    color: "#EFF6FF",
    fontSize: 14,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.7)",
    justifyContent: "center",
    paddingHorizontal: 20,
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
    maxHeight: 320,
  },
  carouselContent: {
    gap: 10,
    paddingVertical: 4,
  },
  designCardWrap: {
    width: DESIGN_CARD_WIDTH,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
  },
  designCardWrapSelected: {
    borderColor: "#60A5FA",
  },
  modalSaveButton: {
    marginTop: 14,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    paddingVertical: 11,
    alignItems: "center",
  },
  modalSaveButtonPressed: {
    opacity: 0.9,
  },
  modalSaveButtonDisabled: {
    opacity: 0.45,
  },
  modalSaveButtonText: {
    color: "#EFF6FF",
    fontSize: 13,
    fontWeight: "700",
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
  modalCloseButtonPressed: {
    opacity: 0.85,
  },
  modalCloseButtonText: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "700",
  },
  updatingBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  updatingCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#111827",
    padding: 18,
    alignItems: "center",
  },
  updatingTitle: {
    color: "#F9FAFB",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 12,
  },
  updatingSubtitle: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 8,
    textAlign: "center",
  },
});
