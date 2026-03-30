import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "../../contexts/AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      await signIn(email, password);
      router.replace("/(tabs)/account");
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : "Failed to log in.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log in to your account</Text>

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

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          styles.submitButton,
          (submitting || !email || !password) && styles.submitButtonDisabled,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleLogin}
        disabled={submitting || !email || !password}
      >
        {submitting ? (
          <ActivityIndicator color="#111827" size="small" />
        ) : (
          <Text style={styles.submitButtonText}>Log In</Text>
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
  buttonPressed: {
    opacity: 0.75,
  },
});
