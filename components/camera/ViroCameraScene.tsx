import { Platform, StyleSheet, Text, UIManager, View } from "react-native";

export function ViroCameraScene() {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return (
      <View style={styles.unsupportedContainer}>
        <Text style={styles.unsupportedTitle}>AR camera is not supported on this platform.</Text>
        <Text style={styles.unsupportedSubtitle}>
          Open this tab from an iOS or Android development build.
        </Text>
      </View>
    );
  }

  const hasNativeARScene =
    Boolean(UIManager.getViewManagerConfig?.("VRTARScene")) &&
    Boolean(UIManager.getViewManagerConfig?.("VRTARSceneNavigator"));

  if (!hasNativeARScene) {
    return (
      <View style={styles.unsupportedContainer}>
        <Text style={styles.unsupportedTitle}>Viro native views are missing in this build.</Text>
        <Text style={styles.unsupportedSubtitle}>
          Rebuild and reinstall the EAS dev client after adding the Viro plugin.
        </Text>
      </View>
    );
  }

  let ViroARScene: any;
  let ViroARSceneNavigator: any;

  try {
    // Import component modules directly to avoid root entry side effects
    // that eagerly initialize optional native managers.
    ViroARScene = require("@reactvision/react-viro/dist/components/AR/ViroARScene").ViroARScene;
    ViroARSceneNavigator =
      require("@reactvision/react-viro/dist/components/AR/ViroARSceneNavigator").ViroARSceneNavigator;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown Viro initialization error.";

    return (
      <View style={styles.unsupportedContainer}>
        <Text style={styles.unsupportedTitle}>AR camera failed to initialize.</Text>
        <Text style={styles.unsupportedSubtitle}>
          Install this update into a new iOS/Android dev build and reopen the app.
        </Text>
        <Text style={styles.debugText}>{errorMessage}</Text>
      </View>
    );
  }

  const MinimalARScene = () => <ViroARScene />;

  return (
    <View style={styles.container}>
      <ViroARSceneNavigator
        autofocus
        initialScene={{ scene: MinimalARScene }}
        style={styles.navigator}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  navigator: {
    flex: 1,
  },
  arText: {
    color: "#FFFFFF",
    fontSize: 28,
    textAlign: "center",
    textAlignVertical: "center",
  },
  unsupportedContainer: {
    flex: 1,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  unsupportedTitle: {
    color: "#E2E8F0",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  unsupportedSubtitle: {
    marginTop: 10,
    color: "#9CA3AF",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 300,
  },
  debugText: {
    marginTop: 12,
    color: "#FCA5A5",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 320,
  },
});
