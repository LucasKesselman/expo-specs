import { SignInWithGoogleModal } from "@/components/SignInWithGoogleModal";
import { Button, ButtonText } from "@/components/ui/button";
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { useAuth, useAuthState } from "@/hooks/useAuth";
import { useThemeColors } from "@/hooks/useThemeColors";
import { type Href, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const REMEMBER_EMAIL_KEY = "@login/remember_email";

/**
 * Login screen: email/password login and signup, forgot password, and Google sign-in (modal).
 * Redirects to account when already signed in.
 */
type Mode = "login" | "signup" | "forgot";

// Base scroll content; centering is applied conditionally when keyboard is hidden
const getScrollContentStyle = (keyboardVisible: boolean): React.ComponentProps<typeof ScrollView>["contentContainerStyle"] => ({
  flexGrow: 1,
  justifyContent: keyboardVisible ? "flex-start" : "center",
  paddingVertical: 48,
  paddingHorizontal: 24,
  alignItems: "center",
});

export default function LoginScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const cardStyle = useMemo(
    () => ({
      backgroundColor: colors.secondary0,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.outline200,
      padding: 24,
      width: "100%" as const,
      maxWidth: 336,
    }),
    [colors]
  );
  const headingStyle = useMemo(
    () => ({ fontSize: 22, fontWeight: "700" as const, color: colors.typography950 }),
    [colors]
  );
  const subtextStyle = useMemo(
    () => ({
      fontSize: 14,
      color: colors.typography500,
      marginTop: 8,
      marginBottom: 20,
    }),
    [colors]
  );
  const user = useAuthState();
  const { login, signUp, resetPassword, signInWithGoogle, loading, error, clearError } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const hasCompletedLoginThisSession = useRef(false);
  const hasShownAlreadyLoggedInAlert = useRef(false);
  const insets = useSafeAreaInsets();

  // Smooth layout change when keyboard shows/hides (iOS)
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Load remembered email on mount
  useEffect(() => {
    AsyncStorage.getItem(REMEMBER_EMAIL_KEY).then((saved) => {
      if (saved != null && saved.length > 0) {
        setEmail(saved);
        setRememberMe(true);
      }
    });
  }, []);

  // Sticky session: already logged in → alert and go to account; fresh login → just go to account
  useEffect(() => {
    if (!user) return;
    if (hasCompletedLoginThisSession.current) {
      router.replace("/(tabs)/account" as Href);
      return;
    }
    if (hasShownAlreadyLoggedInAlert.current) return;
    hasShownAlreadyLoggedInAlert.current = true;
    Alert.alert(
      "Already logged in",
      "You are already logged in.",
      [{ text: "OK", onPress: () => router.replace("/(tabs)/account" as Href) }]
    );
  }, [user, router]);

  // Show error alert when auth fails (Firebase error from useAuth)
  useEffect(() => {
    if (error) {
      Alert.alert("Error", error, [{ text: "OK", onPress: clearError }]);
    }
  }, [error, clearError]);

  const handleSubmit = async () => {
    clearError();
    if (mode === "forgot") {
      if (!email.trim()) {
        Alert.alert("Error", "Enter your email address.");
        return;
      }
      try {
        await resetPassword(email.trim());
        setForgotSent(true);
        Alert.alert(
          "Check your email",
          "We sent a link to reset your password. Check your inbox and follow the link."
        );
      } catch {
        // Error shown via useAuth error + useEffect Alert
      }
      return;
    }
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please enter email and password.");
      return;
    }
    if (mode === "signup") {
      if (password !== confirmPassword) {
        Alert.alert("Error", "Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        Alert.alert("Error", "Password should be at least 6 characters.");
        return;
      }
    }
    try {
      if (mode === "login") {
        hasCompletedLoginThisSession.current = true; // set before await so effect sees it when user updates
        await login(email.trim(), password);
        if (rememberMe) {
          await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
        } else {
          await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
        Alert.alert("Success", "You're logged in.");
        // Redirect happens via useEffect when Firebase auth state updates
      } else {
        hasCompletedLoginThisSession.current = true; // set before await so effect sees it when user updates
        await signUp(email.trim(), password);
        if (rememberMe) {
          await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
        } else {
          await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
        Alert.alert("Success", "Account created. You're logged in.");
        // Redirect happens via useEffect when Firebase auth state updates
      }
    } catch {
      hasCompletedLoginThisSession.current = false; // reset so we don't treat as success if they retry
      // Error shown via useAuth error + useEffect Alert
    }
  };

  const handleGoogleSignIn = () => setShowGoogleModal(true);

  const isForgot = mode === "forgot";
  const isSignup = mode === "signup";

  const title = isForgot ? "Reset password" : isSignup ? "Sign up" : "Log in";
  const subtitle =
    isForgot
      ? "Enter your email and we'll send a reset link."
      : isSignup
        ? "Create an account to continue."
        : "Sign in to continue.";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background0 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
    >
      <ScrollView
        contentContainerStyle={getScrollContentStyle(keyboardVisible)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={cardStyle}>
          <Text style={headingStyle}>{title}</Text>
          <Text style={subtextStyle}>{subtitle}</Text>

          {forgotSent ? (
            <View style={{ gap: 16, marginTop: 8 }}>
              <Text style={{ fontSize: 15, color: colors.success600, textAlign: "center" }}>
                Check your email for a link to reset your password.
              </Text>
              <Button onPress={() => { setForgotSent(false); setMode("login"); }} size="sm">
                <ButtonText>Back to log in</ButtonText>
              </Button>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 14, color: colors.typography950, marginBottom: 6 }}>Email</Text>
              <Input variant="outline" size="md" style={{ marginBottom: 16 }}>
                <InputField
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </Input>

              {!isForgot && (
                <>
                  <Text style={{ fontSize: 14, color: colors.typography950, marginBottom: 6 }}>Password</Text>
                  <Input variant="outline" size="md" style={{ marginBottom: 20 }}>
                    <InputField
                      placeholder="Enter your password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      editable={!loading}
                    />
                    <InputSlot onPress={() => setShowPassword(!showPassword)} style={{ marginRight: 12 }}>
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={colors.typography500}
                      />
                    </InputSlot>
                  </Input>
                </>
              )}

              {isSignup && (
                <>
                  <Text style={{ fontSize: 14, color: colors.typography950, marginBottom: 6 }}>Confirm password</Text>
                  <Input variant="outline" size="md" style={{ marginBottom: 20 }}>
                    <InputField
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      editable={!loading}
                    />
                  </Input>
                </>
              )}

              {!isForgot && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <Pressable
                    onPress={() => setRememberMe((prev) => !prev)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                    hitSlop={8}
                    disabled={loading}
                  >
                    <Ionicons
                      name={rememberMe ? "checkbox" : "checkbox-outline"}
                      size={22}
                      color={rememberMe ? colors.primary500 : colors.typography500}
                    />
                    <Text style={{ fontSize: 13, color: colors.typography500 }}>Remember me</Text>
                  </Pressable>
                  <Button
                    variant="link"
                    size="sm"
                    onPress={() => { clearError(); setMode("forgot"); }}
                    isDisabled={loading}
                  >
                    <ButtonText>Forgot Password?</ButtonText>
                  </Button>
                </View>
              )}

              <Button
                onPress={handleSubmit}
                isDisabled={loading}
                size="sm"
                style={{ width: "100%", marginBottom: 12 }}
              >
                <ButtonText>
                  {loading ? "Please wait…" : isForgot ? "Send reset email" : isSignup ? "Sign up" : "Log in"}
                </ButtonText>
              </Button>

              {!isForgot && (
                <Button
                  action="secondary"
                  variant="outline"
                  onPress={handleGoogleSignIn}
                  isDisabled={loading}
                  size="sm"
                  style={{ width: "100%", marginBottom: 12 }}
                >
                  <MaterialCommunityIcons name="google" size={20} color={colors.typography950} />
                  <ButtonText>Sign in with Google</ButtonText>
                </Button>
              )}

              {!isForgot && (
                <Button
                  variant="link"
                  size="sm"
                  onPress={() => { clearError(); setMode(isSignup ? "login" : "signup"); }}
                  isDisabled={loading}
                >
                  <ButtonText>
                    {isSignup ? "Already have an account? Log in" : "Don't have an account? Sign up"}
                  </ButtonText>
                </Button>
              )}
            </>
          )}
        </View>

        <View style={{ marginTop: 24 }}>
          <Button
            variant="outline"
            action="secondary"
            size="sm"
            onPress={() => router.replace("/(auth)/landing-page" as Href)}
          >
            <ButtonText>Back to landing page</ButtonText>
          </Button>
        </View>
      </ScrollView>

      <SignInWithGoogleModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
      />
    </KeyboardAvoidingView>
  );
}
