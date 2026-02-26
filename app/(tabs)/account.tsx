import { Button, ButtonText } from "@/components/ui/button";
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { Input, InputField } from "@/components/ui/input";
import { useSavedDesignsContext } from "@/contexts/SavedDesignsContext";
import { useAuth, useAuthState } from "@/hooks/useAuth";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useTheme } from "@/contexts/ThemeContext";
import {
  createDesignInFirestore,
  createGarmentInFirestore,
} from "@/lib/catalogFirestore";
import type { SavedDesignWithId } from "@/lib/savedDesigns";
import { useFocusEffect } from "@react-navigation/native";
import { type Href, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

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

/**
 * Native-style collapsible section (iOS/Android). Header is tappable; content is shown when expanded.
 * Default collapsed so User settings / Create Design / Create Garment are hidden until opened.
 */
function CollapsibleSection({
  title,
  children,
  defaultExpanded = false,
  styles,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  styles: ReturnType<typeof createAccountStyles>;
  colors: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const onToggle = useCallback(() => {
    if (Platform.OS === "ios" || Platform.OS === "android") {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpanded((prev) => !prev);
  }, []);

  return (
    <View style={styles.collapsibleSection}>
      <Pressable
        style={({ pressed }) => [
          styles.collapsibleHeader,
          pressed && styles.collapsibleHeaderPressed,
        ]}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}, ${expanded ? "expanded" : "collapsed"}`}
      >
        <Text style={styles.collapsibleHeaderTitle}>{title}</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={22}
          color={colors.typography500}
        />
      </Pressable>
      {expanded ? <View style={styles.collapsibleContent}>{children}</View> : null}
    </View>
  );
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
  userEmail,
  showTitle = true,
}: {
  styles: ReturnType<typeof createAccountStyles>;
  colors: Record<string, string>;
  userEmail: string | null;
  showTitle?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const { resetPassword, loading: authLoading, error: authError, clearError } = useAuth();
  const [darkMode, setDarkMode] = useState(theme === "dark");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    setDarkMode(theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (userEmail && !forgotEmail) setForgotEmail(userEmail);
  }, [userEmail]);

  const handleApply = () => {
    setTheme(darkMode ? "dark" : "light");
  };

  const handleForgotPassword = async () => {
    const email = forgotEmail.trim();
    if (!email) return;
    clearError();
    setForgotSent(false);
    try {
      await resetPassword(email);
      setForgotSent(true);
      Alert.alert("Check your email", "If an account exists for that email, we sent a password reset link.");
    } catch {
      // error shown via authError
    }
  };

  return (
    <View style={styles.settingsSection}>
      {showTitle ? <Text style={styles.settingsSectionTitle}>User settings</Text> : null}
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

        <Text style={[styles.settingsSectionTitle, { marginTop: 20 }]}>Forgot password</Text>
        <FormControl style={{ marginTop: 6 }}>
          <FormControlLabel>
            <FormControlLabelText>Email</FormControlLabelText>
          </FormControlLabel>
          <View style={styles.forgotRow}>
            <Input variant="outline" size="md" style={styles.forgotInput}>
              <InputField
                placeholder="your@email.com"
                value={forgotEmail}
                onChangeText={(text) => {
                  setForgotEmail(text);
                  if (authError) clearError();
                  setForgotSent(false);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Input>
            <Button
              size="sm"
              variant="solid"
              action="primary"
              onPress={handleForgotPassword}
              isDisabled={!forgotEmail.trim() || authLoading}
              style={styles.forgotButtonSquare}
            >
              {authLoading ? (
                <Text style={styles.forgotButtonSquareText}>…</Text>
              ) : (
                <Ionicons name="arrow-forward" size={20} color={colors.typography0} />
              )}
            </Button>
          </View>
          {authError ? (
            <Text style={styles.forgotError}>{authError}</Text>
          ) : forgotSent ? (
            <Text style={styles.forgotSuccess}>Reset link sent. Check your email.</Text>
          ) : null}
        </FormControl>
      </View>
    </View>
  );
}

function CreateDesignSection({
  userEmail,
  styles,
  colors,
}: {
  userEmail: string;
  styles: ReturnType<typeof createAccountStyles>;
  colors: Record<string, string>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [categories, setCategories] = useState("tees, new");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Missing field", "Enter a design name.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const id = await createDesignInFirestore(userEmail, {
        name,
        description: description || undefined,
        image: image || undefined,
        categories: categories || undefined,
      });
      Alert.alert("Design created", `Design "${name.trim()}" was added. (ID: ${id})`);
      setName("");
      setDescription("");
      setImage("");
      setCategories("tees, new");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create design.";
      setError(message);
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.settingsSection}>
      <View style={styles.settingsCard}>
        <FormControl style={styles.formField}>
          <FormControlLabel>
            <FormControlLabelText>Name</FormControlLabelText>
          </FormControlLabel>
          <Input variant="outline" size="md" style={styles.formInput}>
            <InputField
              placeholder="Design name"
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
          </Input>
        </FormControl>
        <FormControl style={styles.formField}>
          <FormControlLabel>
            <FormControlLabelText>Description</FormControlLabelText>
          </FormControlLabel>
          <Input variant="outline" size="md" style={styles.formInput}>
            <InputField
              placeholder="Short description"
              value={description}
              onChangeText={setDescription}
              editable={!loading}
            />
          </Input>
        </FormControl>
        <FormControl style={styles.formField}>
          <FormControlLabel>
            <FormControlLabelText>Image URL</FormControlLabelText>
          </FormControlLabel>
          <Input variant="outline" size="md" style={styles.formInput}>
            <InputField
              placeholder="https://..."
              value={image}
              onChangeText={setImage}
              keyboardType="url"
              autoCapitalize="none"
              editable={!loading}
            />
          </Input>
        </FormControl>
        <FormControl style={styles.formField}>
          <FormControlLabel>
            <FormControlLabelText>Categories (comma-separated)</FormControlLabelText>
          </FormControlLabel>
          <Input variant="outline" size="md" style={styles.formInput}>
            <InputField
              placeholder="tees, new, bestseller"
              value={categories}
              onChangeText={setCategories}
              editable={!loading}
            />
          </Input>
        </FormControl>
        {error ? <Text style={styles.forgotError}>{error}</Text> : null}
        <Button
          size="sm"
          variant="solid"
          action="primary"
          onPress={handleCreate}
          isDisabled={loading}
          style={styles.applyButton}
        >
          <ButtonText>{loading ? "Creating…" : "Create Design"}</ButtonText>
        </Button>
      </View>
    </View>
  );
}

function CreateGarmentSection({
  userEmail,
  styles,
  colors,
}: {
  userEmail: string;
  styles: ReturnType<typeof createAccountStyles>;
  colors: Record<string, string>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [color, setColor] = useState("White");
  const [sizes, setSizes] = useState("S, M, L, XL");
  const [categories, setCategories] = useState("tees, new");
  const [releaseYear, setReleaseYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Missing field", "Enter a garment name.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const id = await createGarmentInFirestore(userEmail, {
        name,
        description: description || undefined,
        image: image || undefined,
        color: color || undefined,
        sizes: sizes || undefined,
        categories: categories || undefined,
        releaseYear: releaseYear || undefined,
      });
      Alert.alert("Garment created", `"${name.trim()}" was added. (ID: ${id})`);
      setName("");
      setDescription("");
      setImage("");
      setColor("White");
      setSizes("S, M, L, XL");
      setCategories("tees, new");
      setReleaseYear(String(new Date().getFullYear()));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create garment.";
      setError(message);
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.settingsSection}>
      <View style={styles.settingsCard}>
        <FormControl style={styles.formField}>
          <FormControlLabel>
            <FormControlLabelText>Name</FormControlLabelText>
          </FormControlLabel>
          <Input variant="outline" size="md" style={styles.formInput}>
            <InputField
              placeholder="Garment name"
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
          </Input>
        </FormControl>
        <FormControl style={styles.formField}>
          <FormControlLabel>
            <FormControlLabelText>Description</FormControlLabelText>
          </FormControlLabel>
          <Input variant="outline" size="md" style={styles.formInput}>
            <InputField
              placeholder="Short description"
              value={description}
              onChangeText={setDescription}
              editable={!loading}
            />
          </Input>
        </FormControl>
        <FormControl style={styles.formField}>
          <FormControlLabel>
            <FormControlLabelText>Image URL</FormControlLabelText>
          </FormControlLabel>
          <Input variant="outline" size="md" style={styles.formInput}>
            <InputField
              placeholder="https://..."
              value={image}
              onChangeText={setImage}
              keyboardType="url"
              autoCapitalize="none"
              editable={!loading}
            />
          </Input>
        </FormControl>
        <FormControl style={styles.formField}>
          <FormControlLabel>
            <FormControlLabelText>Color</FormControlLabelText>
          </FormControlLabel>
          <Input variant="outline" size="md" style={styles.formInput}>
            <InputField
              placeholder="e.g. White, Black"
              value={color}
              onChangeText={setColor}
              editable={!loading}
            />
          </Input>
        </FormControl>
        <FormControl style={styles.formField}>
          <FormControlLabel>
            <FormControlLabelText>Sizes (comma-separated)</FormControlLabelText>
          </FormControlLabel>
          <Input variant="outline" size="md" style={styles.formInput}>
            <InputField
              placeholder="XS, S, M, L, XL"
              value={sizes}
              onChangeText={setSizes}
              editable={!loading}
            />
          </Input>
        </FormControl>
        <FormControl style={styles.formField}>
          <FormControlLabel>
            <FormControlLabelText>Categories (comma-separated)</FormControlLabelText>
          </FormControlLabel>
          <Input variant="outline" size="md" style={styles.formInput}>
            <InputField
              placeholder="tees, new, bestseller"
              value={categories}
              onChangeText={setCategories}
              editable={!loading}
            />
          </Input>
        </FormControl>
        <FormControl style={styles.formField}>
          <FormControlLabel>
            <FormControlLabelText>Release year</FormControlLabelText>
          </FormControlLabel>
          <Input variant="outline" size="md" style={styles.formInput}>
            <InputField
              placeholder="2024"
              value={releaseYear}
              onChangeText={setReleaseYear}
              keyboardType="number-pad"
              editable={!loading}
            />
          </Input>
        </FormControl>
        {error ? <Text style={styles.forgotError}>{error}</Text> : null}
        <Button
          size="sm"
          variant="solid"
          action="primary"
          onPress={handleCreate}
          isDisabled={loading}
          style={styles.applyButton}
        >
          <ButtonText>{loading ? "Creating…" : "Create Garment"}</ButtonText>
        </Button>
      </View>
    </View>
  );
}

function createAccountStyles(colors: Record<string, string>) {
  return StyleSheet.create({
    collapsibleSection: { marginHorizontal: 20, marginBottom: 12 },
    collapsibleHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.background100,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.outline200,
    },
    collapsibleHeaderPressed: { opacity: 0.7 },
    collapsibleHeaderTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.typography950,
    },
    collapsibleContent: { marginTop: 8, marginBottom: 16 },
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
    formField: {
      marginBottom: 16,
    },
    formInput: {
      marginTop: 4,
    },
    forgotRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 6,
    },
    forgotInput: {
      flex: 1,
      minWidth: 0,
    },
    forgotButtonSquare: {
      width: 44,
      height: 44,
      minWidth: 44,
      minHeight: 44,
      padding: 0,
      justifyContent: "center",
      alignItems: "center",
    },
    forgotButtonSquareText: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.typography0,
    },
    forgotError: {
      fontSize: 13,
      color: colors.error500,
      marginTop: 4,
      marginBottom: 4,
    },
    forgotSuccess: {
      fontSize: 13,
      color: colors.success500 ?? colors.primary500,
      marginTop: 4,
      marginBottom: 4,
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
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createAccountStyles(colors), [colors]);
  const { logout } = useAuth();
  const user = useAuthState();
  const { savedDesigns, loading, error, refresh, remove, removingId } = useSavedDesignsContext();

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
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Account</Text>
        {user ? (
          <>
            <SessionInfo user={user} colors={colors} />
            <CollapsibleSection title="User settings" styles={styles} colors={colors}>
              <UserSettingsSection
                styles={styles}
                colors={colors}
                userEmail={user.email ?? null}
                showTitle={false}
              />
            </CollapsibleSection>
            <CollapsibleSection title="Create Design" styles={styles} colors={colors}>
              <CreateDesignSection userEmail={user.email ?? ""} styles={styles} colors={colors} />
            </CollapsibleSection>
            <CollapsibleSection title="Create Garment" styles={styles} colors={colors}>
              <CreateGarmentSection userEmail={user.email ?? ""} styles={styles} colors={colors} />
            </CollapsibleSection>
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
