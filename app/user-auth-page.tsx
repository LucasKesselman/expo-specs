import { SignInWithGoogleModal } from "@/components/SignInWithGoogleModal";
import { Button, ButtonText } from "@/components/ui/button";
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { Input, InputField } from "@/components/ui/input";
import { useAuth, useAuthState } from "@/hooks/useAuth";
import { type Href, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Mode = "login" | "signup" | "forgot";

export default function UserAuthPage() {
  const router = useRouter();
  const user = useAuthState();
  const { login, signUp, resetPassword, signInWithGoogle, loading, error, clearError } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace("/" as Href);
    }
  }, [user, router]);

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
      } catch {
        // error set in useAuth
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
      } else {
        await signUp(email.trim(), password);
      }
      router.replace("/" as Href);
    } catch {
      // error set in useAuth
    }
  };

  const handleGoogleSignIn = () => {
    setShowGoogleModal(true);
  };

  const isForgot = mode === "forgot";
  const isSignup = mode === "signup";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
          paddingBottom: 48,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 22, fontWeight: "600", marginBottom: 24, textAlign: "center" }}>
          {isForgot ? "Reset password" : isSignup ? "Sign up" : "Log in"}
        </Text>

        {error ? (
          <View style={{ marginBottom: 16, padding: 12, backgroundColor: "#fee2e2", borderRadius: 8 }}>
            <Text style={{ color: "#b91c1c" }}>{error}</Text>
          </View>
        ) : null}

        {forgotSent ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: "#15803d", marginBottom: 16 }}>
              Check your email for a link to reset your password.
            </Text>
            <Button onPress={() => { setForgotSent(false); setMode("login"); }}>
              <ButtonText>Back to log in</ButtonText>
            </Button>
          </View>
        ) : (
          <>
            <FormControl style={{ marginBottom: 16 }} size="md">
              <FormControlLabel>
                <FormControlLabelText>Email</FormControlLabelText>
              </FormControlLabel>
              <Input>
                <InputField
                  placeholder="email@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </Input>
            </FormControl>

            {!isForgot && (
              <>
                <FormControl style={{ marginBottom: 16 }} size="md">
                  <FormControlLabel>
                    <FormControlLabelText>Password</FormControlLabelText>
                  </FormControlLabel>
                  <Input>
                    <InputField
                      placeholder="••••••••"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      editable={!loading}
                    />
                  </Input>
                </FormControl>

                {isSignup && (
                  <FormControl style={{ marginBottom: 16 }} size="md">
                    <FormControlLabel>
                      <FormControlLabelText>Confirm password</FormControlLabelText>
                    </FormControlLabel>
                    <Input>
                      <InputField
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        editable={!loading}
                      />
                    </Input>
                  </FormControl>
                )}
              </>
            )}

            <Button onPress={handleSubmit} isDisabled={loading} style={{ marginBottom: 12 }}>
              <ButtonText>{loading ? "Please wait…" : isForgot ? "Send reset email" : isSignup ? "Sign up" : "Log in"}</ButtonText>
            </Button>

            {!isForgot && (
              <TouchableOpacity
                onPress={() => { clearError(); setMode("forgot"); }}
                style={{ marginBottom: 16 }}
                disabled={loading}
              >
                <Text style={{ color: "#2563eb", fontSize: 14 }}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {!isForgot && (
              <Button action="secondary" onPress={handleGoogleSignIn} isDisabled={loading} style={{ marginBottom: 12 }}>
                <ButtonText>Sign in with Google</ButtonText>
              </Button>
            )}

            <SignInWithGoogleModal
              isOpen={showGoogleModal}
              onClose={() => setShowGoogleModal(false)}
            />

            {!isForgot && (
              <TouchableOpacity
                onPress={() => { clearError(); setMode(isSignup ? "login" : "signup"); }}
                style={{ marginBottom: 24 }}
                disabled={loading}
              >
                <Text style={{ color: "#64748b", fontSize: 14 }}>
                  {isSignup ? "Already have an account? Log in" : "Don’t have an account? Sign up"}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <Button variant="outline" action="secondary" onPress={() => router.replace("/" as Href)}>
          <ButtonText>Back to homepage</ButtonText>
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
