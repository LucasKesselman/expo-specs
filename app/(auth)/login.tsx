import { SignInWithGoogleModal } from "@/components/SignInWithGoogleModal";
import { Button, ButtonText } from "@/components/ui/button";
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { useAuth, useAuthState } from "@/hooks/useAuth";
import { type Href, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

type Mode = "login" | "signup" | "forgot";

// Top-aligned layout so content doesn't jump when keyboard opens or on scroll
const SCROLL_CONTENT_STYLE = {
  flexGrow: 1,
  paddingTop: 48,
  paddingBottom: 48,
  paddingHorizontal: 24,
  alignItems: "center" as const,
};

const CARD_STYLE = {
  backgroundColor: "#ffffff",
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#e2e8f0",
  padding: 24,
  width: "100%" as const,
  maxWidth: 336,
};

const HEADING_STYLE = {
  fontSize: 22,
  fontWeight: "700" as const,
  color: "#0f172a",
};

const SUBTEXT_STYLE = {
  fontSize: 14,
  color: "#64748b",
  marginTop: 8,
  marginBottom: 20,
};

export default function LoginScreen() {
  const router = useRouter();
  const user = useAuthState();
  const { login, signUp, resetPassword, signInWithGoogle, loading, error, clearError } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Firebase is source of truth: when user is set, redirect to tabs
  useEffect(() => {
    if (user) {
      router.replace("/(tabs)" as Href);
    }
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
        await login(email.trim(), password);
        Alert.alert("Success", "You're logged in.");
        // Redirect happens via useEffect when Firebase auth state updates
      } else {
        await signUp(email.trim(), password);
        Alert.alert("Success", "Account created. You're logged in.");
        // Redirect happens via useEffect when Firebase auth state updates
      }
    } catch {
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
      style={{ flex: 1, backgroundColor: "#f8fafc" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={SCROLL_CONTENT_STYLE}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={CARD_STYLE}>
          <Text style={HEADING_STYLE}>{title}</Text>
          <Text style={SUBTEXT_STYLE}>{subtitle}</Text>

          {forgotSent ? (
            <View style={{ gap: 16, marginTop: 8 }}>
              <Text style={{ fontSize: 15, color: "#15803d", textAlign: "center" }}>
                Check your email for a link to reset your password.
              </Text>
              <Button onPress={() => { setForgotSent(false); setMode("login"); }} size="sm">
                <ButtonText>Back to log in</ButtonText>
              </Button>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 14, color: "#0f172a", marginBottom: 6 }}>Email</Text>
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
                  <Text style={{ fontSize: 14, color: "#0f172a", marginBottom: 6 }}>Password</Text>
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
                        color="#64748b"
                      />
                    </InputSlot>
                  </Input>
                </>
              )}

              {isSignup && (
                <>
                  <Text style={{ fontSize: 14, color: "#0f172a", marginBottom: 6 }}>Confirm password</Text>
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
                  <Text style={{ fontSize: 13, color: "#64748b" }}>Remember me</Text>
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
            onPress={() => router.replace("/(tabs)" as Href)}
          >
            <ButtonText>Back to homepage</ButtonText>
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
