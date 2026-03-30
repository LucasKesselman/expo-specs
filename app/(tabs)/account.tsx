import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Pressable, ScrollView, StyleSheet, Text, View, Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";

const FALLBACK_ACCESSORY_HEIGHT = 70;
const FALLBACK_ACCESSORY_SPACING = 16;

export default function AccountTabScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isUserDetailsExpanded, setIsUserDetailsExpanded] = useState(false);
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
