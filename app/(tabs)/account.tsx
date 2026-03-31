import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Pressable, ScrollView, StyleSheet, Text, View, Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { collection, doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { firestore } from "../../lib/firebase";

const FALLBACK_ACCESSORY_HEIGHT = 70;
const FALLBACK_ACCESSORY_SPACING = 16;
const USERS_COLLECTION = "Users";
const GARMENTS_COLLECTION = "Garments";

type GarmentCardData = {
  id: string;
  size: string;
  color: string;
  printStatus: string;
  qrCodeStatus: string;
  physicalDesignId: string | null;
  digitalDesignId: string | null;
};

function normalizeGarmentId(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    const segments = trimmed.split("/").filter(Boolean);
    return segments.length ? segments[segments.length - 1] : trimmed;
  }

  if (typeof value === "object" && value !== null) {
    if ("id" in value && typeof (value as { id?: unknown }).id === "string") {
      return ((value as { id: string }).id || "").trim() || null;
    }

    if ("path" in value && typeof (value as { path?: unknown }).path === "string") {
      const path = (value as { path: string }).path.trim();
      if (!path) {
        return null;
      }
      const segments = path.split("/").filter(Boolean);
      return segments.length ? segments[segments.length - 1] : null;
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

export default function AccountTabScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isUserDetailsExpanded, setIsUserDetailsExpanded] = useState(false);
  const [isLoadingGarments, setIsLoadingGarments] = useState(false);
  const [ownedGarments, setOwnedGarments] = useState<GarmentCardData[]>([]);
  const [garmentsErrorMessage, setGarmentsErrorMessage] = useState<string | null>(null);
  const scrollBottomInset = useMemo(() => {
    if (Platform.OS === "ios") {
      return 40;
    }

    return tabBarHeight + FALLBACK_ACCESSORY_HEIGHT + FALLBACK_ACCESSORY_SPACING + insets.bottom;
  }, [insets.bottom, tabBarHeight]);
  const userDetailsJson = useMemo(() => {
    if (!user) {
      return JSON.stringify(
        {
          authenticated: false,
          reason: "No Firebase auth user is currently signed in.",
        },
        null,
        2,
      );
    }

    return JSON.stringify(
      {
        authenticated: true,
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        isAnonymous: user.isAnonymous,
        phoneNumber: user.phoneNumber,
        displayName: user.displayName,
        photoURL: user.photoURL,
        providerId: user.providerId,
        tenantId: user.tenantId,
        metadata: user.metadata,
        providerData: user.providerData,
        firebaseUser: user.toJSON(),
      },
      null,
      2,
    );
  }, [user]);

  useEffect(() => {
    let isCancelled = false;

    const loadOwnedGarments = async () => {
      if (!user) {
        setOwnedGarments([]);
        setGarmentsErrorMessage(null);
        setIsLoadingGarments(false);
        return;
      }

      setIsLoadingGarments(true);
      setGarmentsErrorMessage(null);

      try {
        const userRef = doc(collection(firestore, USERS_COLLECTION), user.uid);
        const userSnapshot = await getDoc(userRef);

        if (!userSnapshot.exists()) {
          if (!isCancelled) {
            setOwnedGarments([]);
          }
          return;
        }

        const userData = userSnapshot.data();
        const rawOwnedGarments = Array.isArray(userData.ownedGarments) ? userData.ownedGarments : [];
        const ownedGarmentIds = Array.from(
          new Set(rawOwnedGarments.map(normalizeGarmentId).filter((id): id is string => Boolean(id))),
        );

        if (!ownedGarmentIds.length) {
          if (!isCancelled) {
            setOwnedGarments([]);
          }
          return;
        }

        const garmentSnapshots = await Promise.all(
          ownedGarmentIds.map(async (garmentId) => {
            try {
              const snapshot = await getDoc(doc(collection(firestore, GARMENTS_COLLECTION), garmentId));
              return { garmentId, snapshot };
            } catch {
              return { garmentId, snapshot: null };
            }
          }),
        );

        const garmentCards = garmentSnapshots.map(({ garmentId, snapshot }) => {
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

          const garmentData = snapshot.data();
          return {
            id: garmentId,
            size: typeof garmentData.size === "string" ? garmentData.size : "Unknown",
            color: typeof garmentData.color === "string" ? garmentData.color : "Unknown",
            printStatus: typeof garmentData.printStatus === "string" ? garmentData.printStatus : "Unknown",
            qrCodeStatus: typeof garmentData.qrCodeStatus === "string" ? garmentData.qrCodeStatus : "Unknown",
            physicalDesignId: normalizeLinkedDocumentId(garmentData.physicalDesign),
            digitalDesignId: normalizeLinkedDocumentId(garmentData.digitalDesign),
          };
        });

        if (!isCancelled) {
          setOwnedGarments(garmentCards);
        }
      } catch {
        if (!isCancelled) {
          setOwnedGarments([]);
          setGarmentsErrorMessage("We couldn't load your garments right now.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingGarments(false);
        }
      }
    };

    void loadOwnedGarments();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  const handleCreatePhysicalDesign = () => {
    if (!user) {
      router.push("/(auth)/landing");
      return;
    }

    router.push("/create-physical-design");
  };

  const handleCreateDigitalDesign = () => {
    if (!user) {
      router.push("/(auth)/landing");
      return;
    }

    router.push("/create-digital-design");
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;

    try {
      setIsSigningOut(true);
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingBottom: scrollBottomInset }]}
    >
      <Text style={styles.heading}>Account</Text>

      {user ? (
        <View style={styles.sessionCard}>
          <Text style={styles.sessionLabel}>Signed in as</Text>
          <Text style={styles.sessionValue}>{user.email ?? user.uid}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              (pressed || isSigningOut) && styles.actionCardPressed,
            ]}
            onPress={handleSignOut}
            disabled={isSigningOut}
          >
            <Text style={styles.secondaryButtonText}>
              {isSigningOut ? "Signing out..." : "Sign Out"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.sessionCard}>
          <Text style={styles.sessionLabel}>You are browsing as a guest.</Text>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.actionCardPressed]}
            onPress={() => router.push("/(auth)/landing")}
          >
            <Text style={styles.primaryButtonText}>Log In / Sign Up</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.sectionHeader}>My Garments</Text>
      {!user ? (
        <Text style={styles.myGarmentsMessage}>Sign in to view your owned garments.</Text>
      ) : isLoadingGarments ? (
        <View style={styles.myGarmentsStateCard}>
          <Text style={styles.myGarmentsMessage}>Loading your garments...</Text>
        </View>
      ) : garmentsErrorMessage ? (
        <View style={styles.myGarmentsStateCard}>
          <Text style={styles.myGarmentsMessage}>{garmentsErrorMessage}</Text>
        </View>
      ) : ownedGarments.length === 0 ? (
        <View style={styles.myGarmentsStateCard}>
          <Text style={styles.myGarmentsMessage}>No garments found on your account yet.</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.garmentsCarouselContent}
          style={styles.garmentsCarousel}
        >
          {ownedGarments.map((garment) => (
            <View key={garment.id} style={styles.garmentCard}>
              <View style={styles.garmentCardHeader}>
                <Ionicons name="shirt-outline" size={20} color="#BFDBFE" />
                <Text numberOfLines={1} style={styles.garmentCardId}>
                  {garment.id}
                </Text>
              </View>

              <View style={styles.garmentCardBody}>
                <Text style={styles.garmentCardLabel}>Size</Text>
                <Text style={styles.garmentCardValue}>{garment.size}</Text>

                <Text style={styles.garmentCardLabel}>Color</Text>
                <Text style={styles.garmentCardValue}>{garment.color}</Text>

                <Text style={styles.garmentCardLabel}>Print Status</Text>
                <Text style={styles.garmentCardValue}>{garment.printStatus}</Text>

                <Text style={styles.garmentCardLabel}>QR Status</Text>
                <Text style={styles.garmentCardValue}>{garment.qrCodeStatus}</Text>

                {garment.physicalDesignId ? (
                  <>
                    <Text style={styles.garmentCardLabel}>Physical Design</Text>
                    <Text numberOfLines={1} style={styles.garmentCardValue}>
                      {garment.physicalDesignId}
                    </Text>
                  </>
                ) : null}

                {garment.digitalDesignId ? (
                  <>
                    <Text style={styles.garmentCardLabel}>Digital Design</Text>
                    <Text numberOfLines={1} style={styles.garmentCardValue}>
                      {garment.digitalDesignId}
                    </Text>
                  </>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Text style={styles.sectionHeader}>User Details</Text>
      <Pressable
        style={({ pressed }) => [
          styles.codeBox,
          !isUserDetailsExpanded && styles.codeBoxCollapsed,
          pressed && styles.actionCardPressed,
        ]}
        onPress={() => setIsUserDetailsExpanded((prev) => !prev)}
      >
        <Text selectable style={styles.codeText}>
          {userDetailsJson}
        </Text>
        <View style={styles.codeBoxIconOverlay}>
          <Ionicons
            name={isUserDetailsExpanded ? "chevron-up" : "chevron-down"}
            size={16}
            color="#E5E7EB"
          />
        </View>
      </Pressable>

      <Text style={styles.sectionHeader}>Admin Tools</Text>
      {user ? (
        <>
          <Pressable
            style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
            onPress={handleCreateDigitalDesign}
          >
            <View style={styles.actionCardIcon}>
              <Ionicons name="albums-outline" size={28} color="#93C5FD" />
            </View>
            <View style={styles.actionCardContent}>
              <Text style={styles.actionCardTitle}>Create Digital Design</Text>
              <Text style={styles.actionCardSubtitle}>
                Upload assets and publish a new digital design
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionCard, styles.actionCardSpacing, pressed && styles.actionCardPressed]}
            onPress={handleCreatePhysicalDesign}
          >
            <View style={styles.actionCardIcon}>
              <Ionicons name="add-circle-outline" size={28} color="#93C5FD" />
            </View>
            <View style={styles.actionCardContent}>
              <Text style={styles.actionCardTitle}>Create Physical Design</Text>
              <Text style={styles.actionCardSubtitle}>
                Upload assets and publish a new physical design
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </Pressable>
        </>
      ) : (
        <Text style={styles.adminToolsGuestMessage}>
          Sign in to save and create your own designs!
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  heading: {
    color: "#F9FAFB",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 18,
  },
  sessionCard: {
    backgroundColor: "#1F2937",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#374151",
    marginBottom: 14,
  },
  sessionLabel: {
    color: "#D1D5DB",
    fontSize: 13,
    fontWeight: "600",
  },
  sessionValue: {
    color: "#F9FAFB",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 12,
  },
  primaryButton: {
    marginTop: 10,
    backgroundColor: "#93C5FD",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryButton: {
    marginTop: 8,
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  secondaryButtonText: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "700",
  },
  sectionHeader: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 4,
    marginBottom: 8,
  },
  myGarmentsStateCard: {
    backgroundColor: "#1F2937",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#374151",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  myGarmentsMessage: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    marginBottom: 14,
  },
  garmentsCarousel: {
    marginBottom: 14,
  },
  garmentsCarouselContent: {
    gap: 10,
    paddingRight: 4,
  },
  garmentCard: {
    width: 162,
    aspectRatio: 9 / 16,
    backgroundColor: "#1F2937",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#374151",
    padding: 12,
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
  codeBox: {
    position: "relative",
    backgroundColor: "#030712",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
    padding: 12,
    marginBottom: 14,
    minHeight: 150,
  },
  codeBoxCollapsed: {
    maxHeight: 150,
    overflow: "hidden",
  },
  codeText: {
    color: "#BFDBFE",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Courier",
    paddingBottom: 28,
  },
  codeBoxIconOverlay: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F2937",
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  actionCardSpacing: {
    marginTop: 10,
  },
  actionCardPressed: {
    opacity: 0.75,
  },
  actionCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  actionCardContent: {
    flex: 1,
  },
  actionCardTitle: {
    color: "#F3F4F6",
    fontSize: 16,
    fontWeight: "700",
  },
  actionCardSubtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  adminToolsGuestMessage: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    marginBottom: 4,
  },
});
