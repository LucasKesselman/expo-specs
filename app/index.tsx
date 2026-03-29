import { Link } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

export default function AppIndex() {
  const runtimeMode = __DEV__ ? "development" : "production";
  const jsEngine = "HermesInternal" in globalThis ? "Hermes" : "JSC";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ArtieApparel App V2 in progress...</Text>

      <Link href="/(tabs)/camera" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Open App</Text>
        </Pressable>
      </Link>

      <View style={styles.debugCard}>
        <Text style={styles.debugTitle}>Debug Status</Text>
        <Text style={styles.debugText}>Platform: {Platform.OS}</Text>
        <Text style={styles.debugText}>Mode: {runtimeMode}</Text>
        <Text style={styles.debugText}>Engine: {jsEngine}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    color: "#111827",
  },
  button: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#111827",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  debugCard: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    minWidth: 240,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  debugText: {
    fontSize: 13,
    color: "#374151",
    textAlign: "center",
  },
});
