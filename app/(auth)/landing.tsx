import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export default function AuthLandingScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/artie-assets/UIStuff/artieFullD.png")}
        style={styles.sideIllustration}
        resizeMode="contain"
      />
      <Image
        source={require("../../assets/artie-assets/UIStuff/iconArtieLogo.png")}
        style={styles.wordmark}
        resizeMode="contain"
      />
      <Text style={styles.title}>Welcome to Artie</Text>
      <Text style={styles.subtitle}>
        Sign in or create an account to manage your creator actions and publish designs.
      </Text>

      <Pressable
        style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
        onPress={() => router.push("/(auth)/login")}
      >
        <Text style={styles.primaryButtonText}>Log In</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
        onPress={() => router.push("/(auth)/signup")}
      >
        <Text style={styles.secondaryButtonText}>Create Account</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.linkButton, pressed && styles.buttonPressed]}
        onPress={() => router.push("/(tabs)/camera")}
      >
        <Text style={styles.linkButtonText}>Continue browsing without logging in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
    paddingHorizontal: 20,
    justifyContent: "center",
    overflow: "hidden",
  },
  sideIllustration: {
    position: "absolute",
    right: -70,
    bottom: -10,
    width: 240,
    height: 420,
    opacity: 0.12,
  },
  wordmark: {
    width: 150,
    height: 34,
    marginBottom: 14,
    opacity: 0.92,
  },
  title: {
    color: "#F9FAFB",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 10,
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  primaryButton: {
    backgroundColor: "#93C5FD",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: "#1F2937",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: "#E5E7EB",
    fontSize: 16,
    fontWeight: "700",
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  linkButtonText: {
    color: "#93C5FD",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.75,
  },
});
