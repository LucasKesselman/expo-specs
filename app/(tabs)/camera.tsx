import { StyleSheet, Text, View } from "react-native";

export default function CameraTabScreen() {
  return (
    <View style={cameraTabScreenStyles.placeholderScreenContainer}>
      {/* Intentional placeholder while camera integration is designed and built. */}
      <Text style={cameraTabScreenStyles.centeredPlaceholderText}>
        placeholder zappar camera content
      </Text>
    </View>
  );
}

const cameraTabScreenStyles = StyleSheet.create({
  placeholderScreenContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#111827",
  },
  centeredPlaceholderText: {
    color: "#e2e8f0",
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
});
