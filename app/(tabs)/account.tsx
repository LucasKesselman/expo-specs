import { Button, ButtonText } from "@/components/ui/button";
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { useAuth, useAuthState } from "@/hooks/useAuth";
import { useSavedDesigns } from "@/hooks/useSavedDesigns";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useTheme } from "@/contexts/ThemeContext";
import type { SavedDesignWithId } from "@/lib/savedDesigns";
import { useFocusEffect } from "@react-navigation/native";
import { type Href, useRouter } from "expo-router";
import type { User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
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

/** Maps Firebase provider id to a short label for the UI. */
function getProviderLabel(providerId: string): string {
  if (providerId === "password") return "Email / Password";
  if (providerId === "google.com") return "Google";
  if (providerId === "apple.com") return "Apple";
  return providerId;
}

function SessionInfo({
  user,
  colors,
}: {
  user: User;
  colors: Record<string, string>;
}) {
  const { metadata, providerData } = user;
  const provider = providerData?.[0];
  const providerName = provider ? getProviderLabel(provider.providerId) : "—";

  return (
    <View
      style={{
        backgroundColor: colors.background100,
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
          color: colors.typography400,
          marginBottom: 12,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        Session info
      </Text>
      <View style={{ gap: 10 }}>
        <InfoRow colors={colors} label="Email" value={user.email ?? "—"} />
        <InfoRow colors={colors} label="Display name" value={user.displayName ?? "—"} />
        <InfoRow colors={colors} label="User ID" value={user.uid} />
        <InfoRow colors={colors} label="Signed in with" value={providerName} />
        <InfoRow colors={colors} label="Last sign-in" value={formatAuthTime(metadata?.lastSignInTime)} />
        <InfoRow colors={colors} label="Account created" value={formatAuthTime(metadata?.creationTime)} />
        <InfoRow
          colors={colors}
          label="Email verified"
          value={user.emailVerified ? "Yes" : "No"}
        />
      </View>
    </View>
  );
}

function InfoRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: Record<string, string>;
}) {
  return (
    <View>
      <Text
        style={{
          fontSize: 11,
          color: colors.typography500,
          marginBottom: 2,
        }}
      >
        {label}
      </Text>
      <Text
        selectable
        style={{
          fontSize: 15,
          color: colors.typography950,
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
  styles,
}: {
  userId: string;
  savedDesigns: SavedDesignWithId[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  remove: (id: string) => void;
  removingId: string | null;
  styles: ReturnType<typeof createAccountStyles>;
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

function UserSettingsSection({
  styles,
  colors,
}: {
  styles: ReturnType<typeof createAccountStyles>;
  colors: Record<string, string>;
}) {
  const { theme, setTheme } = useTheme();
  const [darkMode, setDarkMode] = useState(theme === "dark");

  useEffect(() => {
    setDarkMode(theme === "dark");
  }, [theme]);

  const handleApply = () => {
    setTheme(darkMode ? "dark" : "light");
  };

  return (
    <View style={styles.settingsSection}>
      <Text style={styles.settingsSectionTitle}>User settings</Text>
      <View style={styles.settingsCard}>
        <FormControl>
          <View style={styles.settingRow}>
            <FormControlLabel>
              <FormControlLabelText>Dark mode</FormControlLabelText>
            </FormControlLabel>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: colors.outline300, true: colors.typography400 }}
              thumbColor={darkMode ? colors.background200 : colors.background50}
            />
          </View>
        </FormControl>
        <Button
          size="sm"
          variant="solid"
          action="primary"
          onPress={handleApply}
          style={styles.applyButton}
        >
          <ButtonText>Apply changes</ButtonText>
        </Button>
      </View>
    </View>
  );
}

function createAccountStyles(colors: Record<string, string>) {
  return StyleSheet.create({
    settingsSection: { marginHorizontal: 20, marginBottom: 24 },
    settingsSectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.typography400,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    settingsCard: {
      backgroundColor: colors.background100,
      borderRadius: 12,
      padding: 16,
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    applyButton: {
      marginTop: 16,
    },
    savedSection: { marginHorizontal: 20, marginBottom: 24 },
    savedSectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.typography400,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    savedSectionSubtext: { fontSize: 14, color: colors.typography500, marginBottom: 12 },
    savedSectionError: { fontSize: 14, color: colors.error500, marginBottom: 4 },
    savedList: { flexDirection: "row", gap: 12, paddingVertical: 4 },
    savedCard: {
      width: 120,
      backgroundColor: colors.secondary0,
      borderRadius: 10,
      overflow: "hidden",
      paddingBottom: 8,
      shadowColor: colors.typography0,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
    savedCardImage: {
      width: "100%",
      aspectRatio: 1,
      backgroundColor: colors.background100,
      resizeMode: "cover",
    },
    savedCardName: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.typography950,
      marginHorizontal: 8,
      marginTop: 6,
    },
    savedCardPrice: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primary500,
      marginHorizontal: 8,
      marginTop: 2,
    },
    savedCardButton: {
      marginHorizontal: 8,
      marginTop: 6,
    },
    pageTitle: {
      fontSize: 24,
      fontWeight: "600",
      color: colors.typography950,
      marginHorizontal: 20,
      marginBottom: 20,
    },
    notSignedInBox: {
      marginHorizontal: 20,
      marginBottom: 24,
      padding: 16,
      backgroundColor: colors.backgroundwarning,
      borderRadius: 12,
    },
    notSignedInText: {
      fontSize: 15,
      color: colors.warning800,
    },
    logoutWrap: {
      alignItems: "center",
      marginTop: 8,
    },
  });
}

export default function AccountTab() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createAccountStyles(colors), [colors]);
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
    <View style={{ flex: 1, backgroundColor: colors.background0 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 24,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Account</Text>
        {user ? (
          <>
            <SessionInfo user={user} colors={colors} />
            <UserSettingsSection styles={styles} colors={colors} />
            <SavedDesignsSection
              userId={user.uid}
              savedDesigns={savedDesigns}
              loading={loading}
              error={error}
              refresh={refresh}
              remove={remove}
              removingId={removingId}
              styles={styles}
            />
          </>
        ) : (
          <View style={styles.notSignedInBox}>
            <Text style={styles.notSignedInText}>
              Not signed in. Use the landing or login flow to sign in.
            </Text>
          </View>
        )}
        <View style={styles.logoutWrap}>
          <Button variant="outline" action="secondary" onPress={handleLogout}>
            <ButtonText>Logout</ButtonText>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
