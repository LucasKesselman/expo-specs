import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";

const FALLBACK_TAB_BAR_HEIGHT = 56;
const FALLBACK_ACCESSORY_HEIGHT = 70;
const FALLBACK_ACCESSORY_SPACING = 16;
const SUPPORT_EMAIL = "artie@artie.com";
const PRIVACY_URL = "https://www.yourapp.com/privacy";
const TERMS_URL = "https://www.yourapp.com/terms";

export default function AccountTabScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const scrollBottomInset = useMemo(() => {
    if (Platform.OS === "ios") {
      return 40;
    }

    return (
      FALLBACK_TAB_BAR_HEIGHT +
      FALLBACK_ACCESSORY_HEIGHT +
      FALLBACK_ACCESSORY_SPACING +
      insets.bottom
    );
  }, [insets.bottom]);

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

  const handleOpenSupportEmail = () => {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  };

  const handleOpenPrivacy = () => {
    void Linking.openURL(PRIVACY_URL);
  };

  const handleOpenTerms = () => {
    void Linking.openURL(TERMS_URL);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: scrollBottomInset },
      ]}
    >
      <Text style={styles.heading}>Account</Text>

      {user ? (
        <View style={styles.sessionCard}>
          <Text style={styles.sessionLabel}>Signed in as</Text>
          <View style={styles.sessionDetails}>
            <Text style={styles.sessionDetailText}>
              Email: {user.email ?? "Not available"}
            </Text>
          </View>
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
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.actionCardPressed,
            ]}
            onPress={() => router.push("/(auth)/landing")}
          >
            <Text style={styles.primaryButtonText}>Log In / Sign Up</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.sectionHeader}>Admin Tools</Text>
      {user ? (
        <>
          <Pressable
            style={({ pressed }) => [
              styles.actionCard,
              pressed && styles.actionCardPressed,
            ]}
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
            style={({ pressed }) => [
              styles.actionCard,
              styles.actionCardSpacing,
              pressed && styles.actionCardPressed,
            ]}
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

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Contact & Support</Text>
        <Pressable
          style={({ pressed }) => [
            styles.footerLinkRow,
            pressed && styles.actionCardPressed,
          ]}
          onPress={handleOpenSupportEmail}
        >
          <Ionicons name="mail-outline" size={16} color="#93C5FD" />
          <Text style={styles.footerLinkText}>{SUPPORT_EMAIL}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.footerLinkRow,
            pressed && styles.actionCardPressed,
          ]}
          onPress={handleOpenPrivacy}
        >
          <Ionicons name="shield-checkmark-outline" size={16} color="#93C5FD" />
          <Text style={styles.footerLinkText}>Privacy Policy</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.footerLinkRow,
            pressed && styles.actionCardPressed,
          ]}
          onPress={handleOpenTerms}
        >
          <Ionicons name="document-text-outline" size={16} color="#93C5FD" />
          <Text style={styles.footerLinkText}>Terms of Service</Text>
        </Pressable>
        <Text style={styles.footerDisclaimer}>
          For support, contact us at {SUPPORT_EMAIL}. We respond in 1-2 business
          days.
        </Text>
        <Text style={styles.footerDisclaimer}>
          This app is provided "as is". Availability and features may vary by
          region and device.
        </Text>
      </View>
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
  sessionDetails: {
    marginTop: 6,
    marginBottom: 12,
    rowGap: 4,
  },
  sessionDetailText: {
    color: "#F9FAFB",
    fontSize: 15,
    fontWeight: "700",
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
  footer: {
    marginTop: 20,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#374151",
    backgroundColor: "#0B1220",
    gap: 8,
  },
  footerTitle: {
    color: "#D1D5DB",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  footerLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  footerLinkText: {
    color: "#BFDBFE",
    fontSize: 14,
    fontWeight: "600",
  },
  footerDisclaimer: {
    color: "#9CA3AF",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
});
