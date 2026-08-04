import { StyleSheet, Text, View } from "react-native";

export default function LinkGarmentWebScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Link Garment Coming Soon</Text>
      <Text style={styles.description}>
        Scanning a garment QR code to claim ownership is currently available in the iPhone
        app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
    backgroundColor: "#111827",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    color: "#F9FAFB",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 420,
    color: "#9CA3AF",
  },
});
