import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../contexts/AuthContext";
import { auth, functions } from "../../lib/firebase";
import { SUPPORT_EMAIL } from "../../lib/support";

const FALLBACK_TAB_BAR_HEIGHT = 56;
const FALLBACK_ACCESSORY_HEIGHT = 70;
const FALLBACK_ACCESSORY_SPACING = 16;

function getAuthErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: unknown }).code);
    if (
      code === "auth/wrong-password" ||
      code === "auth/invalid-credential" ||
      code === "auth/invalid-login-credentials"
    ) {
      return "Incorrect password.";
    }
    if (code === "auth/too-many-requests") {
      return "Too many attempts. Please try again later.";
    }
    if (code.startsWith("functions/")) {
      const message =
        "message" in error && typeof (error as { message?: unknown }).message === "string"
          ? (error as { message: string }).message
          : "";
      const trimmed = message.replace(/^Firebase:\s*/i, "").trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unable to delete account. Please try again.";
}

export default function AccountTabScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState<string | null>(null);
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

  const isAccountBusy = isSigningOut || isDeletingAccount;

  const handleCreateDigitalDesign = () => {
    if (!user) {
      router.push("/(auth)/landing");
      return;
    }

    router.push("/create-digital-design");
  };

  const handleLinkGarment = () => {
    if (!user) {
      router.push("/(auth)/landing");
      return;
    }

    router.push("/link-garment");
  };

  const handleSignOut = async () => {
    if (isAccountBusy) return;

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
    router.push("/privacy-policy");
  };

  const handleOpenTerms = () => {
    router.push("/terms-of-service");
  };

  const closePasswordModal = () => {
    if (isDeletingAccount) return;
    Keyboard.dismiss();
    setIsPasswordModalVisible(false);
    setDeletePassword("");
    setDeletePasswordError(null);
  };

  const handleDeleteAccountPress = () => {
    if (isAccountBusy) return;

    Alert.alert(
      "Delete Account",
      "This permanently deletes your account, wardrobe saves, and garment nicknames. Garments you own will be unlinked and can be claimed again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            setDeletePassword("");
            setDeletePasswordError(null);
            setIsPasswordModalVisible(true);
          },
        },
      ],
    );
  };

  const handleConfirmDeleteAccount = async () => {
    if (isDeletingAccount) return;
    Keyboard.dismiss();

    const currentUser = auth.currentUser;
    const email = currentUser?.email?.trim();
    if (!currentUser || !email) {
      setDeletePasswordError(
        "This account cannot be deleted from the app. Contact support.",
      );
      return;
    }

    if (!deletePassword) {
      setDeletePasswordError("Enter your password to confirm.");
      return;
    }

    setIsDeletingAccount(true);
    setDeletePasswordError(null);

    try {
      const credential = EmailAuthProvider.credential(email, deletePassword);
      await reauthenticateWithCredential(currentUser, credential);

      const uid = currentUser.uid;
      const deleteAccount = httpsCallable(functions, "deleteAccount");
      await deleteAccount();

      await AsyncStorage.multiRemove([
        `garmentNicknames:${uid}`,
        `selectedDigitalDesign:${uid}`,
      ]);

      try {
        await signOut();
      } catch {
        // Auth user may already be gone after a successful deleteAccount call.
      }

      setIsPasswordModalVisible(false);
      setDeletePassword("");
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setDeletePasswordError(message);
      Alert.alert("Unable to delete account", message);
    } finally {
      setIsDeletingAccount(false);
    }
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
              (pressed || isAccountBusy) && styles.actionCardPressed,
            ]}
            onPress={handleSignOut}
            disabled={isAccountBusy}
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

      <Text style={styles.sectionHeader}>Garments</Text>
      {user ? (
        <Pressable
          style={({ pressed }) => [
            styles.actionCard,
            pressed && styles.actionCardPressed,
          ]}
          onPress={handleLinkGarment}
        >
          <View style={styles.actionCardIcon}>
            <Ionicons name="qr-code-outline" size={28} color="#93C5FD" />
          </View>
          <View style={styles.actionCardContent}>
            <Text style={styles.actionCardTitle}>Link Garment</Text>
            <Text style={styles.actionCardSubtitle}>
              Scan a garment QR code to claim ownership
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6B7280" />
        </Pressable>
      ) : (
        <Text style={styles.adminToolsGuestMessage}>
          Sign in to link a garment to your account.
        </Text>
      )}

      <Text style={[styles.sectionHeader, styles.sectionHeaderSpacing]}>Admin Tools</Text>
      {user ? (
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
              Upload files and publish a new digital design
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6B7280" />
        </Pressable>
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

      {user ? (
        <View style={styles.deleteSection}>
          <Pressable
            style={({ pressed }) => [
              styles.destructiveButton,
              (pressed || isAccountBusy) && styles.actionCardPressed,
            ]}
            onPress={handleDeleteAccountPress}
            disabled={isAccountBusy}
          >
            <Text style={styles.destructiveButtonText}>Delete Account</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal
        visible={isPasswordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closePasswordModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={closePasswordModal} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm your password</Text>
            <Text style={styles.modalBody}>
              Enter your password to permanently delete your account.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={deletePassword}
              onChangeText={(value) => {
                setDeletePassword(value);
                if (deletePasswordError) {
                  setDeletePasswordError(null);
                }
              }}
              placeholder="Password"
              placeholderTextColor="#6B7280"
              secureTextEntry
              textContentType="password"
              autoComplete="password"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isDeletingAccount}
              returnKeyType="done"
              onSubmitEditing={() => {
                void handleConfirmDeleteAccount();
              }}
            />
            {deletePasswordError ? (
              <Text style={styles.modalError}>{deletePasswordError}</Text>
            ) : null}
            <Pressable
              style={({ pressed }) => [
                styles.modalDeleteButton,
                (pressed || isDeletingAccount || !deletePassword) &&
                  styles.actionCardPressed,
              ]}
              onPress={() => {
                void handleConfirmDeleteAccount();
              }}
              disabled={isDeletingAccount || !deletePassword}
            >
              {isDeletingAccount ? (
                <ActivityIndicator color="#FEE2E2" size="small" />
              ) : (
                <Text style={styles.modalDeleteButtonText}>Delete Account</Text>
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modalCancelButton,
                (pressed || isDeletingAccount) && styles.actionCardPressed,
              ]}
              onPress={closePasswordModal}
              disabled={isDeletingAccount}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  deleteSection: {
    marginTop: 20,
    marginBottom: 8,
  },
  destructiveButton: {
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#7F1D1D",
  },
  destructiveButtonText: {
    color: "#FCA5A5",
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
  sectionHeaderSpacing: {
    marginTop: 18,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F2937",
    borderRadius: 14,
    padding: 16,
    gap: 12,
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },
  modalCard: {
    backgroundColor: "#1F2937",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#374151",
    padding: 18,
  },
  modalTitle: {
    color: "#F9FAFB",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  modalBody: {
    color: "#D1D5DB",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: "#111827",
    borderColor: "#374151",
    borderWidth: 1,
    borderRadius: 10,
    color: "#F3F4F6",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  modalError: {
    color: "#FCA5A5",
    fontSize: 13,
    marginBottom: 10,
  },
  modalDeleteButton: {
    backgroundColor: "#7F1D1D",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalDeleteButtonText: {
    color: "#FEE2E2",
    fontSize: 14,
    fontWeight: "800",
  },
  modalCancelButton: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalCancelButtonText: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "700",
  },
});
