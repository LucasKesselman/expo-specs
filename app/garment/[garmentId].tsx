import { useLocalSearchParams } from "expo-router";
import { collection, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../../contexts/AuthContext";
import { firestore } from "../../lib/firebase";

const GARMENTS_COLLECTION = "Garments";
const USERS_COLLECTION = "Users";
const DIGITAL_DESIGNS_COLLECTION = "DigitalDesigns";

type GarmentDetails = {
  id: string;
  garmentPath: string;
  size: string;
  color: string;
  printStatus: string;
  qrCodeStatus: string;
  physicalDesignId: string | null;
  digitalDesignId: string | null;
  digitalDesignPath: string | null;
};

type SavedDigitalDesignOption = {
  id: string;
  path: string;
  name: string;
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

function normalizeSavedDigitalDesignReference(
  value: unknown,
): { id: string; path: string } | null {
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    if (trimmed.includes("/")) {
      const segments = trimmed.split("/").filter(Boolean);
      if (!segments.length) {
        return null;
      }
      return { id: segments[segments.length - 1], path: trimmed };
    }
    return {
      id: trimmed,
      path: `${DIGITAL_DESIGNS_COLLECTION}/${trimmed}`,
    };
  }

  if (typeof value === "object" && value !== null) {
    const maybePath =
      "path" in value && typeof (value as { path?: unknown }).path === "string"
        ? (value as { path: string }).path.trim()
        : "";
    const maybeId =
      "id" in value && typeof (value as { id?: unknown }).id === "string"
        ? (value as { id: string }).id.trim()
        : "";

    if (maybePath) {
      const segments = maybePath.split("/").filter(Boolean);
      const id = maybeId || (segments.length ? segments[segments.length - 1] : "");
      if (!id) {
        return null;
      }
      return { id, path: maybePath };
    }

    if (maybeId) {
      return {
        id: maybeId,
        path: `${DIGITAL_DESIGNS_COLLECTION}/${maybeId}`,
      };
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

  return {
    id: garmentId,
    garmentPath,
    size: typeof data.size === "string" ? data.size : "Unknown",
    color: typeof data.color === "string" ? data.color : "Unknown",
    printStatus:
      typeof data.printStatus === "string" ? data.printStatus : "Unavailable",
    qrCodeStatus:
      typeof data.qrCodeStatus === "string" ? data.qrCodeStatus : "Unavailable",
    physicalDesignId: normalizeLinkedDocumentId(data.physicalDesign),
    digitalDesignId,
    digitalDesignPath:
      digitalDesignPath ||
      (digitalDesignId ? `${DIGITAL_DESIGNS_COLLECTION}/${digitalDesignId}` : null),
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

  return {
    id: garmentId,
    garmentPath,
    size: getParamAsString(params.size) || "Unknown",
    color: getParamAsString(params.color) || "Unknown",
    printStatus: getParamAsString(params.printStatus) || "Unavailable",
    qrCodeStatus: getParamAsString(params.qrCodeStatus) || "Unavailable",
    physicalDesignId: getParamAsString(params.physicalDesignId) || null,
    digitalDesignId: getParamAsString(params.digitalDesignId) || null,
    digitalDesignPath: getParamAsString(params.digitalDesignPath) || null,
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
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [savedDigitalDesignOptions, setSavedDigitalDesignOptions] = useState<
    SavedDigitalDesignOption[]
  >([]);
  const [selectedDigitalDesignPath, setSelectedDigitalDesignPath] = useState<
    string | null
  >(null);
  const [isLoadingSavedDesigns, setIsLoadingSavedDesigns] = useState(false);
  const [isUpdatingGarment, setIsUpdatingGarment] = useState(false);
  const [editMessage, setEditMessage] = useState<string | null>(null);
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

            if (isMounted) {
              const mapped = mapSnapshotToGarmentDetails(
                garmentId,
                snapshot.ref.path,
                snapshot.data(),
              );
              setGarment(mapped);
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
    if (!isEditModalVisible) {
      return;
    }

    let isMounted = true;

    const loadSavedDigitalDesigns = async () => {
      if (!user) {
        if (isMounted) {
          setSavedDigitalDesignOptions([]);
          setSelectedDigitalDesignPath(null);
          setEditMessage("Sign in to edit this garment.");
        }
        return;
      }

      if (isMounted) {
        setIsLoadingSavedDesigns(true);
        setEditMessage(null);
      }

      try {
        const userSnapshot = await getDoc(
          doc(collection(firestore, USERS_COLLECTION), user.uid),
        );
        const userData = userSnapshot.exists() ? userSnapshot.data() : {};
        const rawSavedDigitalDesigns = Array.isArray(userData.savedDigitalDesigns)
          ? userData.savedDigitalDesigns
          : [];

        const normalizedRefs = Array.from(
          rawSavedDigitalDesigns
            .map(normalizeSavedDigitalDesignReference)
            .filter((ref): ref is { id: string; path: string } => ref !== null)
            .reduce((acc, ref) => {
              if (!acc.has(ref.path)) {
                acc.set(ref.path, ref);
              }
              return acc;
            }, new Map<string, { id: string; path: string }>())
            .values(),
        );

        const optionResults = await Promise.all(
          normalizedRefs.map(async (ref) => {
            try {
              const snapshot = await getDoc(doc(firestore, ref.path));
              if (!snapshot.exists()) {
                return { id: ref.id, path: ref.path, name: ref.id };
              }
              const data = snapshot.data();
              const name =
                typeof data.name === "string" && data.name.trim()
                  ? data.name.trim()
                  : ref.id;
              return { id: ref.id, path: ref.path, name };
            } catch {
              return { id: ref.id, path: ref.path, name: ref.id };
            }
          }),
        );

        if (!isMounted) {
          return;
        }

        setSavedDigitalDesignOptions(optionResults);

        const preferredPath = garment?.digitalDesignPath;
        const hasPreferred = Boolean(
          preferredPath &&
            optionResults.some((option) => option.path === preferredPath),
        );

        setSelectedDigitalDesignPath(
          hasPreferred ? preferredPath! : (optionResults[0]?.path ?? null),
        );
      } catch (error) {
        if (isMounted) {
          setSavedDigitalDesignOptions([]);
          setSelectedDigitalDesignPath(null);
          setEditMessage(
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
  }, [garment?.digitalDesignPath, isEditModalVisible, user]);

  const handleUpdateGarmentDigitalDesign = async () => {
    if (!garment) {
      setEditMessage("Garment details are not loaded yet.");
      return;
    }

    if (!selectedDigitalDesignPath) {
      setEditMessage("Select one saved digital design to continue.");
      return;
    }

    const selectedDesign = savedDigitalDesignOptions.find(
      (option) => option.path === selectedDigitalDesignPath,
    );
    if (!selectedDesign) {
      setEditMessage("Selected design is not available. Please choose again.");
      return;
    }

    setIsUpdatingGarment(true);
    setEditMessage(null);
    setUpdateNotice(null);

    try {
      const garmentRef = doc(
        firestore,
        garment.garmentPath || `${GARMENTS_COLLECTION}/${garment.id}`,
      );

      await updateDoc(garmentRef, {
        digitalDesign: doc(firestore, selectedDesign.path),
        lastUpdatedAt: serverTimestamp(),
      });

      setGarment((previous) =>
        previous
          ? {
              ...previous,
              digitalDesignId: selectedDesign.id,
              digitalDesignPath: selectedDesign.path,
            }
          : previous,
      );
      setUpdateNotice(`Updated garment to design "${selectedDesign.name}".`);
      setIsEditModalVisible(false);
    } catch (error) {
      setEditMessage(
        error instanceof Error
          ? error.message
          : "Failed to update garment design.",
      );
    } finally {
      setIsUpdatingGarment(false);
    }
  };

  const isSelectedDesignAlreadyApplied =
    Boolean(selectedDigitalDesignPath) &&
    selectedDigitalDesignPath === garment?.digitalDesignPath;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Garment Details</Text>
      <Text style={styles.subtitle}>
        {garment?.id ?? garmentId ?? "Unknown garment"}
      </Text>

      <View style={styles.metaContainer}>
        <Text style={styles.metaLabel}>Size</Text>
        <Text style={styles.metaValue}>{garment?.size ?? "Unknown"}</Text>
      </View>
      <View style={styles.metaContainer}>
        <Text style={styles.metaLabel}>Color</Text>
        <Text style={styles.metaValue}>{garment?.color ?? "Unknown"}</Text>
      </View>
      <View style={styles.metaContainer}>
        <Text style={styles.metaLabel}>Print Status</Text>
        <Text style={styles.metaValue}>{garment?.printStatus ?? "Unavailable"}</Text>
      </View>
      <View style={styles.metaContainer}>
        <Text style={styles.metaLabel}>QR Status</Text>
        <Text style={styles.metaValue}>{garment?.qrCodeStatus ?? "Unavailable"}</Text>
      </View>
      <View style={styles.metaContainer}>
        <Text style={styles.metaLabel}>Physical Design</Text>
        <Text style={styles.metaValue}>{garment?.physicalDesignId ?? "N/A"}</Text>
      </View>
      <View style={styles.metaContainer}>
        <Text style={styles.metaLabel}>Digital Design</Text>
        <Text style={styles.metaValue}>{garment?.digitalDesignId ?? "N/A"}</Text>
      </View>
      {updateNotice ? <Text style={styles.successText}>{updateNotice}</Text> : null}

      <Pressable
        onPress={() => {
          setIsEditModalVisible(true);
        }}
        style={({ pressed }) => [
          styles.editButton,
          pressed ? styles.editButtonPressed : null,
        ]}
      >
        <Text style={styles.editButtonText}>Edit</Text>
      </Pressable>

      {isHydrating ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#93C5FD" />
          <Text style={styles.loadingText}>Refreshing garment details...</Text>
        </View>
      ) : null}
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setIsEditModalVisible(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Garment</Text>
            <Text style={styles.modalDescription}>Select one saved digital design.</Text>

            {isLoadingSavedDesigns ? (
              <View style={styles.modalLoadingRow}>
                <ActivityIndicator color="#93C5FD" />
                <Text style={styles.loadingText}>Loading saved designs...</Text>
              </View>
            ) : savedDigitalDesignOptions.length === 0 ? (
              <Text style={styles.modalEmptyText}>
                No saved digital designs were found on your account.
              </Text>
            ) : (
              <View style={styles.optionList}>
                {savedDigitalDesignOptions.map((option) => {
                  const isSelected = selectedDigitalDesignPath === option.path;

                  return (
                    <Pressable
                      key={option.path}
                      onPress={() => {
                        setSelectedDigitalDesignPath(option.path);
                      }}
                      style={({ pressed }) => [
                        styles.optionRow,
                        isSelected ? styles.optionRowSelected : null,
                        pressed ? styles.optionRowPressed : null,
                      ]}
                    >
                      <View style={styles.optionTextContainer}>
                        <Text style={styles.optionName}>{option.name}</Text>
                        <Text style={styles.optionId}>{option.id}</Text>
                      </View>
                      <Text style={styles.optionSelectText}>
                        {isSelected ? "Selected" : "Select"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {editMessage ? <Text style={styles.errorText}>{editMessage}</Text> : null}
            <Pressable
              onPress={() => {
                void handleUpdateGarmentDigitalDesign();
              }}
              disabled={
                isLoadingSavedDesigns ||
                isUpdatingGarment ||
                savedDigitalDesignOptions.length === 0 ||
                isSelectedDesignAlreadyApplied
              }
              style={({ pressed }) => [
                styles.modalSaveButton,
                (pressed && !isUpdatingGarment) ? styles.modalSaveButtonPressed : null,
                (isLoadingSavedDesigns ||
                  isUpdatingGarment ||
                  savedDigitalDesignOptions.length === 0 ||
                  isSelectedDesignAlreadyApplied)
                  ? styles.modalSaveButtonDisabled
                  : null,
              ]}
            >
              <Text style={styles.modalSaveButtonText}>
                {isUpdatingGarment
                  ? "Updating..."
                  : isSelectedDesignAlreadyApplied
                    ? "Already Applied"
                    : "Update Garment"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setIsEditModalVisible(false);
                setEditMessage(null);
              }}
              style={({ pressed }) => [
                styles.modalCloseButton,
                pressed ? styles.modalCloseButtonPressed : null,
              ]}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={isUpdatingGarment} transparent animationType="fade">
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
  title: {
    color: "#F9FAFB",
    fontSize: 24,
    fontWeight: "800",
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
  editButton: {
    marginTop: 18,
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
  optionList: {
    marginTop: 14,
    gap: 8,
  },
  optionRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#374151",
    backgroundColor: "#030712",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  optionRowSelected: {
    borderColor: "#60A5FA",
    backgroundColor: "#111827",
  },
  optionRowPressed: {
    opacity: 0.85,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionName: {
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "700",
  },
  optionId: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  optionSelectText: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "700",
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
