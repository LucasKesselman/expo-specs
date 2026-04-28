import { Platform, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import { ZapparCameraEntry } from "../../components/camera/ZapparCameraEntry";

export default function CameraTabScreen() {
  const showNativeZapparEntry = Platform.OS === "ios";

  return (
    <View style={cameraTabScreenStyles.placeholderScreenContainer}>
      <Image
        source={require("../../assets/artie-assets/UIStuff/fullFigure.gif")}
        style={cameraTabScreenStyles.figure}
        contentFit="contain"
      />
      {showNativeZapparEntry ? (
        <ZapparCameraEntry />
      ) : (
        <>
          <Text style={cameraTabScreenStyles.centeredPlaceholderText}>
            AR Camera Coming Soon
          </Text>
          <Text style={cameraTabScreenStyles.subText}>
            We are polishing the next interactive camera experience for Artie.
          </Text>
        </>
      )}
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
  figure: {
    width: 210,
    height: 260,
    marginBottom: 10,
    opacity: 0.95,
  },
  centeredPlaceholderText: {
    color: "#E2E8F0",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  subText: {
    marginTop: 10,
    color: "#9CA3AF",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 280,
  },
});
