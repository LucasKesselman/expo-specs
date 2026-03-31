import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "../../contexts/AuthContext";

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSignup = async () => {
    if (submitting) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await signUp(email, password);
      router.replace("/(tabs)/account");
    } catch (signupError) {
      const message = signupError instanceof Error ? signupError.message : "Failed to create account.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/artie-assets/UIStuff/iconArtieLogo.png")}
        style={styles.wordmark}
        resizeMode="contain"
      />
      <Text style={styles.title}>Create your account</Text>

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Email"
        placeholderTextColor="#6B7280"
        editable={!submitting}
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        placeholder="Password"
        placeholderTextColor="#6B7280"
        editable={!submitting}
      />
      <TextInput
        style={styles.input}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        placeholder="Confirm password"
        placeholderTextColor="#6B7280"
        editable={!submitting}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          styles.submitButton,
          (submitting || !email || !password || !confirmPassword) && styles.submitButtonDisabled,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleSignup}
        disabled={submitting || !email || !password || !confirmPassword}
      >
        {submitting ? (
          <View style={styles.loadingContent}>
            <Image
              source={require("../../assets/artie-assets/UIStuff/ArtieSymbolBlack.png")}
              style={styles.loadingIcon}
              resizeMode="contain"
            />
            <ActivityIndicator color="#111827" size="small" />
          </View>
        ) : (
          <Text style={styles.submitButtonText}>Sign Up</Text>
        )}
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
    paddingHorizontal: 20,
    paddingTop: 36,
  },
  wordmark: {
    width: 148,
    height: 32,
    marginBottom: 12,
    opacity: 0.92,
  },
  title: {
    color: "#F9FAFB",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 18,
  },
  input: {
    backgroundColor: "#1F2937",
    borderColor: "#374151",
    borderWidth: 1,
    borderRadius: 10,
    color: "#F3F4F6",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: "#93C5FD",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
  },
  loadingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingIcon: {
    width: 16,
    height: 16,
  },
  buttonPressed: {
    opacity: 0.75,
  },
});
