import { Button, ButtonText } from "@/components/ui/button";
import { useAuth, useAuthState } from "@/hooks/useAuth";
import { useSavedDesigns } from "@/hooks/useSavedDesigns";
import type { SavedDesignWithId } from "@/lib/savedDesigns";
import { useFocusEffect } from "@react-navigation/native";
import { type Href, useRouter } from "expo-router";
import type { User } from "firebase/auth";
import { useCallback } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

function formatAuthTime(isoString: string | undefined): string {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return isoString;
  }
}

function getProviderLabel(providerId: string): string {
  if (providerId === "password") return "Email / Password";
  if (providerId === "google.com") return "Google";
  if (providerId === "apple.com") return "Apple";
  return providerId;
}

function SessionInfo({ user }: { user: User }) {
  const { metadata, providerData } = user;
  const provider = providerData?.[0];
  const providerName = provider ? getProviderLabel(provider.providerId) : "—";

  return (
    <View
      style={{
        backgroundColor: "#f1f5f9",
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 24,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: "#475569",
          marginBottom: 12,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        Session info
      </Text>
      <View style={{ gap: 10 }}>
        <InfoRow label="Email" value={user.email ?? "—"} />
        <InfoRow label="Display name" value={user.displayName ?? "—"} />
        <InfoRow label="User ID" value={user.uid} />
        <InfoRow label="Signed in with" value={providerName} />
        <InfoRow label="Last sign-in" value={formatAuthTime(metadata?.lastSignInTime)} />
        <InfoRow label="Account created" value={formatAuthTime(metadata?.creationTime)} />
        <InfoRow
          label="Email verified"
          value={user.emailVerified ? "Yes" : "No"}
        />
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text
        style={{
          fontSize: 11,
          color: "#64748b",
          marginBottom: 2,
        }}
      >
        {label}
      </Text>
      <Text
        selectable
        style={{
          fontSize: 15,
          color: "#0f172a",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function SavedDesignsSection({
  userId,
  savedDesigns,
  loading,
  error,
  refresh,
  remove,
  removingId,
}: {
  userId: string;
  savedDesigns: SavedDesignWithId[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  remove: (id: string) => void;
  removingId: string | null;
}) {

  if (loading) {
    return (
      <View style={styles.savedSection}>
        <Text style={styles.savedSectionTitle}>Saved designs</Text>
        <Text style={styles.savedSectionSubtext}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.savedSection}>
        <Text style={styles.savedSectionTitle}>Saved designs</Text>
        <Text style={styles.savedSectionError}>{error}</Text>
        <Button size="sm" variant="outline" onPress={refresh} style={{ marginTop: 8 }}>
          <ButtonText>Retry</ButtonText>
        </Button>
      </View>
    );
  }

  if (savedDesigns.length === 0) {
    return (
      <View style={styles.savedSection}>
        <Text style={styles.savedSectionTitle}>Saved designs</Text>
        <Text style={styles.savedSectionSubtext}>
          No saved designs yet. Save designs from the Marketplace to see them here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.savedSection}>
      <Text style={styles.savedSectionTitle}>Saved designs</Text>
      <Text style={styles.savedSectionSubtext}>
        {savedDesigns.length} {savedDesigns.length === 1 ? "design" : "designs"} saved
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.savedList}
      >
        {savedDesigns.map((item) => (
          <View key={item.id} style={styles.savedCard}>
            <Image source={{ uri: item.product.image }} style={styles.savedCardImage} />
            <Text style={styles.savedCardName} numberOfLines={2}>
              {item.product.name}
            </Text>
            <Text style={styles.savedCardPrice}>{item.product.price}</Text>
            <Button
              size="sm"
              variant="outline"
              action="secondary"
              onPress={() => {
                Alert.alert(
                  "Remove design",
                  `Remove "${item.product.name}" from your saved designs?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Remove",
                      style: "destructive",
                      onPress: () => remove(item.id),
                    },
                  ]
                );
              }}
              isDisabled={removingId !== null}
              style={styles.savedCardButton}
            >
              <ButtonText>{removingId === item.id ? "Removing…" : "Remove"}</ButtonText>
            </Button>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default function AccountTab() {
  const router = useRouter();
  const { logout } = useAuth();
  const user = useAuthState();
  const { savedDesigns, loading, error, refresh, remove, removingId } = useSavedDesigns(
    user?.uid ?? null
  );

  useFocusEffect(
    useCallback(() => {
      if (user) refresh();
    }, [user, refresh])
  );

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/(auth)/landing-page" as Href);
      Alert.alert("You've been logged out");
    } catch {
      // error surfaced in useAuth if needed
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 24,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "600",
            color: "#0f172a",
            marginHorizontal: 20,
            marginBottom: 20,
          }}
        >
          Account
        </Text>
        {user ? (
          <>
            <SessionInfo user={user} />
            <SavedDesignsSection
              userId={user.uid}
              savedDesigns={savedDesigns}
              loading={loading}
              error={error}
              refresh={refresh}
              remove={remove}
              removingId={removingId}
            />
          </>
        ) : (
          <View
            style={{
              marginHorizontal: 20,
              marginBottom: 24,
              padding: 16,
              backgroundColor: "#fef3c7",
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 15, color: "#92400e" }}>
              Not signed in. Use the landing or login flow to sign in.
            </Text>
          </View>
        )}
        <View
          style={{
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <Button variant="outline" action="secondary" onPress={handleLogout}>
            <ButtonText>Logout</ButtonText>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  savedSection: { marginHorizontal: 20, marginBottom: 24 },
  savedSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  savedSectionSubtext: { fontSize: 14, color: "#64748b", marginBottom: 12 },
  savedSectionError: { fontSize: 14, color: "#b91c1c", marginBottom: 4 },
  savedList: { flexDirection: "row", gap: 12, paddingVertical: 4 },
  savedCard: {
    width: 120,
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  savedCardImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f1f5f9",
    resizeMode: "cover",
  },
  savedCardName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
    marginHorizontal: 8,
    marginTop: 6,
  },
  savedCardPrice: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563eb",
    marginHorizontal: 8,
    marginTop: 2,
  },
  savedCardButton: {
    marginHorizontal: 8,
    marginTop: 6,
  },
});
