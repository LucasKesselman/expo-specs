import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as Linking from "expo-linking";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  type DocumentData,
} from "firebase/firestore";

import { useAuth } from "../contexts/AuthContext";
import { firestore } from "../lib/firebase";

const PHYSICAL_DESIGNS_COLLECTION_CANDIDATES = ["PhysicalDesigns"] as const;
const CHECKOUT_SESSIONS_PATH_TEMPLATE = ["customers", "{uid}", "checkout_sessions"] as const;

interface CartDesignSummary {
  designId: string;
  sourceCollection: string;
  name: string;
  description: string;
  imageUrl: string | null;
  priceLabel: string;
  priceAmountCents: number | null;
  stripePriceId: string | null;
}

function getParamAsString(param: string | string[] | undefined): string {
  if (typeof param === "string") {
    return param;
  }
  if (Array.isArray(param) && typeof param[0] === "string") {
    return param[0];
  }
  return "";
}

function formatPriceLabel(cents: number | null): string {
  if (typeof cents !== "number" || !Number.isFinite(cents) || cents < 0) {
    return "N/A";
  }
  return `$${(cents / 100).toFixed(2)}`;
}

function getOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getOptionalCents(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.round(parsed);
    }
  }

  return null;
}

function getStripePriceId(data: DocumentData): string | null {
  const stripeObject =
    typeof data.stripe === "object" && data.stripe !== null
      ? (data.stripe as Record<string, unknown>)
      : {};

  return (
    getOptionalString(data.stripePriceId) ??
    getOptionalString(data.priceId) ??
    getOptionalString(stripeObject.priceId) ??
    null
  );
}

export default function PhysicalCartScreen() {
  const params = useLocalSearchParams();
  const { user, loading } = useAuth();
  const [summary, setSummary] = useState<CartDesignSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const designId = useMemo(() => getParamAsString(params.designId), [params.designId]);
  const preferredCollection = useMemo(
    () => getParamAsString(params.collection),
    [params.collection],
  );

  const candidateCollections = useMemo(
    () =>
      preferredCollection
        ? [
            preferredCollection,
            ...PHYSICAL_DESIGNS_COLLECTION_CANDIDATES.filter((name) => name !== preferredCollection),
          ]
        : [...PHYSICAL_DESIGNS_COLLECTION_CANDIDATES],
    [preferredCollection],
  );

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace("/(auth)/landing");
    }
  }, [loading, user]);

  useEffect(() => {
    if (!designId) {
      setErrorMessage("Missing physical design ID.");
      setIsLoadingSummary(false);
      return;
    }

    let isMounted = true;

    const hydrateDesign = async () => {
      setIsLoadingSummary(true);
      setErrorMessage(null);

      const fallbackName = getParamAsString(params.name) || "Untitled design";
      const fallbackDescription =
        getParamAsString(params.description) || "No description provided.";
      const fallbackImage =
        getParamAsString(params.fullImageUrl) ||
        getParamAsString(params.thumbnailUrl) ||
        getParamAsString(params.miniImageUrl) ||
        null;

      try {
        for (const collectionName of candidateCollections) {
          const snapshot = await getDoc(doc(collection(firestore, collectionName), designId));
          if (!snapshot.exists()) {
            continue;
          }

          const data = snapshot.data() ?? {};
          const priceAmountCents = getOptionalCents(data.priceAmount);
          const nextSummary: CartDesignSummary = {
            designId,
            sourceCollection: collectionName,
            name: getOptionalString(data.name) ?? fallbackName,
            description: getOptionalString(data.description) ?? fallbackDescription,
            imageUrl:
              getOptionalString(data.marketplaceCardImageURL) ??
              getOptionalString(data.marketplaceFullImageUrl) ??
              getOptionalString(data.marketplaceThumbnailImageURL) ??
              getOptionalString(data.marketplaceThumbnailUrl) ??
              getOptionalString(data.marketplaceMiniImageURL) ??
              fallbackImage,
            priceLabel: formatPriceLabel(priceAmountCents),
            priceAmountCents,
            stripePriceId: getStripePriceId(data),
          };

          if (isMounted) {
            setSummary(nextSummary);
          }
          return;
        }

        throw new Error("Unable to find this physical design.");
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "Unable to load item.");
      } finally {
        if (isMounted) {
          setIsLoadingSummary(false);
        }
      }
    };

    void hydrateDesign();
    return () => {
      isMounted = false;
    };
  }, [
    candidateCollections,
    designId,
    params.description,
    params.fullImageUrl,
    params.miniImageUrl,
    params.name,
    params.thumbnailUrl,
  ]);

  const handleCheckout = useCallback(async () => {
    if (!summary) {
      return;
    }
    if (!user) {
      router.replace("/(auth)/landing");
      return;
    }
    if (!summary.stripePriceId) {
      setErrorMessage(
        "This item is not purchasable yet because a Stripe price ID is missing.",
      );
      return;
    }

    setIsCheckingOut(true);
    setErrorMessage(null);

    const successUrl = Linking.createURL("/(tabs)/physical-marketplace", {
      queryParams: { checkout: "success" },
    });
    const cancelUrl = Linking.createURL("/physical-cart", {
      queryParams: { designId: summary.designId, collection: summary.sourceCollection },
    });

    try {
      const resolvedPath = CHECKOUT_SESSIONS_PATH_TEMPLATE.map((segment) =>
        segment === "{uid}" ? user.uid : segment,
      );
      const checkoutSessionsRef = collection(firestore, resolvedPath.join("/"));
      const checkoutDocRef = await addDoc(checkoutSessionsRef, {
        price: summary.stripePriceId,
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          owner: user.uid,
          physicalDesignId: summary.designId,
          physicalDesign: summary.designId,
        },
        client_reference_id: user.uid,
      });

      await new Promise<void>((resolve, reject) => {
        const unsubscribe = onSnapshot(
          checkoutDocRef,
          (snapshot) => {
            const data = snapshot.data();
            const checkoutUrl = getOptionalString(data?.url);
            const checkoutError = data?.error as { message?: unknown } | undefined;

            if (checkoutError?.message) {
              unsubscribe();
              reject(new Error(String(checkoutError.message)));
              return;
            }

            if (!checkoutUrl) {
              return;
            }

            unsubscribe();
            void Linking.openURL(checkoutUrl)
              .then(() => resolve())
              .catch((error: unknown) => {
                reject(
                  error instanceof Error
                    ? error
                    : new Error("Unable to open Stripe Checkout URL."),
                );
              });
          },
          (error) => {
            unsubscribe();
            reject(error instanceof Error ? error : new Error("Checkout listener failed."));
          },
        );
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to start checkout. Please try again.",
      );
    } finally {
      setIsCheckingOut(false);
    }
  }, [summary, user]);

  if (loading || isLoadingSummary) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#93C5FD" size="large" />
        <Text style={styles.loadingText}>Loading cart item...</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{errorMessage ?? "Unable to load cart item."}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Checkout</Text>
      <Text style={styles.subheading}>Review your garment before paying on Stripe.</Text>

      <View style={styles.card}>
        {summary.imageUrl ? (
          <Image source={{ uri: summary.imageUrl }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackText}>No image</Text>
          </View>
        )}

        <Text style={styles.name}>{summary.name}</Text>
        <Text style={styles.description}>{summary.description}</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Physical design</Text>
          <Text style={styles.rowValue}>{summary.designId}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Owner</Text>
          <Text style={styles.rowValue}>{user?.uid ?? "N/A"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Price</Text>
          <Text style={styles.rowValue}>{summary.priceLabel}</Text>
        </View>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Pressable
        onPress={() => {
          void handleCheckout();
        }}
        style={({ pressed }) => [
          styles.checkoutButton,
          (pressed || isCheckingOut) && styles.checkoutButtonPressed,
        ]}
        disabled={isCheckingOut}
      >
        <Text style={styles.checkoutButtonText}>
          {isCheckingOut ? "Opening Stripe Checkout..." : "Continue to Stripe Checkout"}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
            return;
          }
          router.replace("/(tabs)/physical-marketplace");
        }}
        style={styles.cancelButton}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </Pressable>
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
    paddingBottom: 40,
  },
  heading: {
    color: "#F9FAFB",
    fontSize: 26,
    fontWeight: "800",
  },
  subheading: {
    color: "#9CA3AF",
    fontSize: 14,
    marginTop: 6,
    marginBottom: 16,
  },
  card: {
    borderRadius: 14,
    backgroundColor: "#030712",
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 12,
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: "#1F2937",
  },
  imageFallback: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
  },
  imageFallbackText: {
    color: "#D1D5DB",
    fontSize: 13,
    fontWeight: "700",
  },
  name: {
    marginTop: 12,
    color: "#F9FAFB",
    fontSize: 20,
    fontWeight: "800",
  },
  description: {
    marginTop: 8,
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  rowLabel: {
    color: "#93C5FD",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  rowValue: {
    marginTop: 4,
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "600",
  },
  checkoutButton: {
    marginTop: 18,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  checkoutButtonPressed: {
    opacity: 0.8,
  },
  checkoutButtonText: {
    color: "#EFF6FF",
    fontSize: 14,
    fontWeight: "700",
  },
  cancelButton: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  cancelButtonText: {
    color: "#D1D5DB",
    fontSize: 14,
    fontWeight: "700",
  },
  errorText: {
    marginTop: 12,
    color: "#FCA5A5",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "600",
  },
});
