import { StyleSheet, Text, View } from "react-native";

export default function CameraTabWebScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Camera Coming Soon</Text>
      <Text style={styles.description}>
        The AR camera experience is currently available in the iPhone app.
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
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 420,
  },
});
