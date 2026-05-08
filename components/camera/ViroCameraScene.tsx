import { useCallback, useRef, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, UIManager, View } from "react-native";

const ARTIE_FULL_D_IMAGE = require("../../assets/artie-assets/UIStuff/frontTargetImage_01.png");
const ARTIE_TARGET_HEIGHT_METERS = 0.1524;
const ARTIE_TARGET_ID = "artieFullDTarget";
const REMOTE_GLTF_MODEL_URI =
  "https://firebasestorage.googleapis.com/v0/b/ar-assets-bucket/o/DigitalDesigns%2Fh6XmPCTzzQ3aXRfNrjNK%2FdesignAsset_01.glb?alt=media&token=7c7a94ad-c96d-4201-bf34-c3eea74b91c7";
const ARTIE_IMAGE_ASSET = Image.resolveAssetSource(ARTIE_FULL_D_IMAGE);
const ARTIE_IMAGE_WIDTH_PX = Number(ARTIE_IMAGE_ASSET?.width);
const ARTIE_IMAGE_HEIGHT_PX = Number(ARTIE_IMAGE_ASSET?.height);
const HAS_VALID_ARTIE_IMAGE_DIMENSIONS =
  Number.isFinite(ARTIE_IMAGE_WIDTH_PX) &&
  Number.isFinite(ARTIE_IMAGE_HEIGHT_PX) &&
  ARTIE_IMAGE_WIDTH_PX > 0 &&
  ARTIE_IMAGE_HEIGHT_PX > 0;
const ARTIE_TARGET_WIDTH_METERS =
  HAS_VALID_ARTIE_IMAGE_DIMENSIONS
    ? ARTIE_TARGET_HEIGHT_METERS * (ARTIE_IMAGE_WIDTH_PX / ARTIE_IMAGE_HEIGHT_PX)
    : ARTIE_TARGET_HEIGHT_METERS;

let hasRegisteredMarkerAssets = false;

type CaptureResult = {
  success?: boolean;
  url?: string;
  errorCode?: number;
};

function buildCaptureName(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

function getErrorMessage(prefix: string, errorCode?: number) {
  return errorCode !== undefined ? `${prefix} (code ${errorCode}).` : prefix;
}

export function ViroCameraScene() {
  const arNavigatorRef = useRef<any>(null);
  const suppressNextPressRef = useRef(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [statusText, setStatusText] = useState("Tap for photo. Hold for video.");

  const getNavigatorHandle = useCallback(() => {
    const ref = arNavigatorRef.current;
    return ref?.sceneNavigator ?? ref;
  }, []);

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
  let ViroARTrackingTargets: any;
  let ViroARImageMarker: any;
  let ViroAmbientLight: any;
  let Viro3DObject: any;

  try {
    // Import component modules directly to avoid root entry side effects
    // that eagerly initialize optional native managers.
    ViroARScene = require("@reactvision/react-viro/dist/components/AR/ViroARScene").ViroARScene;
    ViroARSceneNavigator =
      require("@reactvision/react-viro/dist/components/AR/ViroARSceneNavigator").ViroARSceneNavigator;
    ViroARTrackingTargets =
      require("@reactvision/react-viro/dist/components/AR/ViroARTrackingTargets").ViroARTrackingTargets;
    ViroARImageMarker =
      require("@reactvision/react-viro/dist/components/AR/ViroARImageMarker").ViroARImageMarker;
    ViroAmbientLight =
      require("@reactvision/react-viro/dist/components/ViroAmbientLight").ViroAmbientLight;
    Viro3DObject = require("@reactvision/react-viro/dist/components/Viro3DObject").Viro3DObject;
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

  if (!hasRegisteredMarkerAssets) {
    ViroARTrackingTargets.createTargets({
      [ARTIE_TARGET_ID]: {
        source: ARTIE_FULL_D_IMAGE,
        orientation: "Up",
        physicalHeight: ARTIE_TARGET_HEIGHT_METERS,
        physicalWidth: ARTIE_TARGET_WIDTH_METERS,
      },
    });

    hasRegisteredMarkerAssets = true;
  }

  const MarkerScene = () => (
    <ViroARScene>
      <ViroAmbientLight color="#FFFFFF" intensity={800} />
      <ViroARImageMarker target={ARTIE_TARGET_ID}>
        <Viro3DObject
          source={{ uri: REMOTE_GLTF_MODEL_URI }}
          type="GLB"
          position={[0, 0.02, 0]}
          scale={[0.0008, 0.0008, 0.0008]}
          rotation={[0, 0, 0]}
          onLoadStart={() => {
            setStatusText("Loading 3D model...");
          }}
          onLoadEnd={() => {
            setStatusText("3D model loaded.");
          }}
          onError={(event: any) => {
            const errorMessage =
              event?.nativeEvent?.error || "Unknown 3D model loading error.";
            setStatusText(`Model failed to load: ${errorMessage}`);
          }}
        />
      </ViroARImageMarker>
    </ViroARScene>
  );

  const handleScreenshotPress = useCallback(async () => {
    if (suppressNextPressRef.current) {
      suppressNextPressRef.current = false;
      return;
    }
    if (isBusy || isRecording) {
      return;
    }
    const navigator = getNavigatorHandle();
    if (!navigator?.takeScreenshot) {
      setStatusText("Photo capture is unavailable in this build.");
      return;
    }

    setIsBusy(true);
    setStatusText("Capturing photo...");
    try {
      const result: CaptureResult = await navigator.takeScreenshot(
        buildCaptureName("ar-photo"),
        true,
      );
      if (result?.success) {
        setStatusText("Photo saved to your library.");
      } else {
        setStatusText(getErrorMessage("Photo capture failed", result?.errorCode));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected screenshot error.";
      setStatusText(`Photo capture failed: ${message}`);
    } finally {
      setIsBusy(false);
    }
  }, [getNavigatorHandle, isBusy, isRecording]);

  const handleStartRecording = useCallback(async () => {
    if (isBusy || isRecording) {
      return;
    }
    suppressNextPressRef.current = true;

    const navigator = getNavigatorHandle();
    if (!navigator?.startVideoRecording) {
      setStatusText("Video capture is unavailable in this build.");
      return;
    }

    setIsBusy(true);
    setStatusText("Starting video...");
    try {
      navigator.startVideoRecording(
        buildCaptureName("ar-video"),
        true,
        (errorCode: number) => {
          setIsRecording(false);
          setStatusText(getErrorMessage("Recording failed", errorCode));
        },
      );
      setIsRecording(true);
      setStatusText("Recording... release to stop.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected recording error.";
      setStatusText(`Recording failed: ${message}`);
    } finally {
      setIsBusy(false);
    }
  }, [getNavigatorHandle, isBusy, isRecording]);

  const handleStopRecording = useCallback(async () => {
    if (!isRecording || isBusy) {
      return;
    }
    const navigator = getNavigatorHandle();
    if (!navigator?.stopVideoRecording) {
      setIsRecording(false);
      setStatusText("Unable to stop video: recorder is unavailable.");
      return;
    }

    setIsBusy(true);
    setStatusText("Finishing video...");
    try {
      const result: CaptureResult = await navigator.stopVideoRecording();
      if (result?.success) {
        setStatusText("Video saved to your library.");
      } else {
        setStatusText(getErrorMessage("Video save failed", result?.errorCode));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected stop-recording error.";
      setStatusText(`Failed to finish video: ${message}`);
    } finally {
      setIsRecording(false);
      setIsBusy(false);
      setTimeout(() => {
        suppressNextPressRef.current = false;
      }, 0);
    }
  }, [getNavigatorHandle, isBusy, isRecording]);

  const handleCapturePressOut = useCallback(() => {
    if (isRecording) {
      void handleStopRecording();
      return;
    }
    if (suppressNextPressRef.current) {
      setTimeout(() => {
        suppressNextPressRef.current = false;
      }, 0);
    }
  }, [handleStopRecording, isRecording]);

  return (
    <View style={styles.container}>
      <ViroARSceneNavigator
        ref={arNavigatorRef}
        autofocus
        initialScene={{ scene: MarkerScene }}
        style={styles.navigator}
      />
      <View pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.bottomPanel}>
          <Text style={styles.statusText}>{statusText}</Text>
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onLongPress={handleStartRecording}
            onPress={handleScreenshotPress}
            onPressOut={handleCapturePressOut}
            style={({ pressed }) => [
              styles.captureButtonOuter,
              isRecording && styles.captureButtonOuterRecording,
              (pressed || isBusy) && styles.captureButtonOuterPressed,
            ]}
          >
            <View
              style={[
                styles.captureButtonInner,
                isRecording && styles.captureButtonInnerRecording,
              ]}
            />
          </Pressable>
        </View>
      </View>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingBottom: 36,
    paddingHorizontal: 20,
  },
  bottomPanel: {
    alignItems: "center",
    gap: 14,
  },
  statusText: {
    color: "#F9FAFB",
    fontSize: 13,
    textAlign: "center",
    backgroundColor: "rgba(17,24,39,0.76)",
    borderRadius: 14,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 300,
  },
  captureButtonOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 5,
    borderColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  captureButtonOuterPressed: {
    opacity: 0.86,
  },
  captureButtonOuterRecording: {
    borderColor: "#F87171",
  },
  captureButtonInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FFFFFF",
  },
  captureButtonInnerRecording: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#EF4444",
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
