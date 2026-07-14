import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, UIManager, View } from "react-native";

import {
  detectDesignAssetKind,
  getDesignAssetKindLabel,
  type DesignAssetMeta,
} from "../../lib/detectDesignAssetKind";

const ARTIE_TARGET_HEIGHT_METERS = 0.1524;

const ARTIE_TARGET_IMAGE_ENTRIES = [
  {
    id: "frontTargetImage_01",
    source: require("../../assets/artie-assets/TargetImages/frontTargetImage_01.png"),
  },
  {
    id: "frontTargetImage_02",
    source: require("../../assets/artie-assets/TargetImages/frontTargetImage_02.jpeg"),
  },
  {
    id: "frontTargetImage_03",
    source: require("../../assets/artie-assets/TargetImages/frontTargetImage_03.jpeg"),
  },
] as const;

type ArtieTargetImage = {
  id: string;
  source: number;
  physicalWidthMeters: number;
  physicalHeightMeters: number;
};

function resolveTargetImageDimensions(source: number, physicalHeightMeters: number) {
  const asset = Image.resolveAssetSource(source);
  const widthPx = Number(asset?.width);
  const heightPx = Number(asset?.height);
  const hasValidDimensions =
    Number.isFinite(widthPx) && Number.isFinite(heightPx) && widthPx > 0 && heightPx > 0;

  return {
    physicalWidthMeters: hasValidDimensions
      ? physicalHeightMeters * (widthPx / heightPx)
      : physicalHeightMeters,
    physicalHeightMeters,
  };
}

const ARTIE_TARGET_IMAGES: ArtieTargetImage[] = ARTIE_TARGET_IMAGE_ENTRIES.map(
  ({ id, source }) => ({
    id,
    source,
    ...resolveTargetImageDimensions(source, ARTIE_TARGET_HEIGHT_METERS),
  }),
);

const REMOTE_DESIGN_ASSET_URI =
  "https://firebasestorage.googleapis.com/v0/b/ar-assets-bucket/o/DigitalDesigns%2FDcl3WxHNomlc2rBA1xuv%2FdesignAsset_01.mp4?alt=media&token=39da2181-eaef-475e-aec4-f4ca084c18ac";
const DESIGN_ASSET_META = detectDesignAssetKind(REMOTE_DESIGN_ASSET_URI);

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

function getUnsupportedAssetMessage(assetMeta: DesignAssetMeta) {
  if (assetMeta.extension) {
    return `Unsupported design asset type: ${assetMeta.extension}`;
  }

  return "Unsupported design asset: could not determine file type.";
}

type DesignAssetContentProps = {
  assetMeta: DesignAssetMeta;
  uri: string;
  markerWidthMeters: number;
  markerHeightMeters: number;
  Viro3DObject: any;
  ViroImage: any;
  ViroVideo: any;
  onStatusChange: (message: string) => void;
};

function DesignAssetContent({
  assetMeta,
  uri,
  markerWidthMeters,
  markerHeightMeters,
  Viro3DObject,
  ViroImage,
  ViroVideo,
  onStatusChange,
}: DesignAssetContentProps) {
  const source = { uri };
  const assetLabel = getDesignAssetKindLabel(assetMeta.kind);
  const loadHandlers = {
    onLoadStart: () => {
      onStatusChange(`Loading ${assetLabel}...`);
    },
    onLoadEnd: () => {
      onStatusChange(`${assetLabel.charAt(0).toUpperCase()}${assetLabel.slice(1)} loaded.`);
    },
    onError: (event: any) => {
      const errorMessage = event?.nativeEvent?.error || `Unknown ${assetLabel} loading error.`;
      onStatusChange(`${assetLabel.charAt(0).toUpperCase()}${assetLabel.slice(1)} failed to load: ${errorMessage}`);
    },
  };

  switch (assetMeta.kind) {
    case "image":
      return (
        <ViroImage
          source={source}
          width={markerWidthMeters}
          height={markerHeightMeters}
          position={[0, 0, 0]}
          rotation={[-90, 0, 0]}
          {...loadHandlers}
        />
      );
    case "video":
      return (
        <ViroVideo
          source={source}
          width={markerWidthMeters}
          height={markerHeightMeters}
          position={[0, 0, 0]}
          rotation={[-90, 0, 0]}
          loop
          muted={false}
          {...loadHandlers}
        />
      );
    case "model3d":
      return (
        <Viro3DObject
          source={source}
          type={assetMeta.viro3dType}
          position={[0, 0.02, 0]}
          scale={[0.0008, 0.0008, 0.0008]}
          rotation={[315, 0, 0]}
          {...loadHandlers}
        />
      );
    default:
      return null;
  }
}

export function ViroCameraScene() {
  const arNavigatorRef = useRef<any>(null);
  const suppressNextPressRef = useRef(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [statusText, setStatusText] = useState("Tap for photo. Hold for video.");

  useEffect(() => {
    if (DESIGN_ASSET_META.kind === "unsupported") {
      setStatusText(getUnsupportedAssetMessage(DESIGN_ASSET_META));
    }
  }, []);

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
  let ViroImage: any;
  let ViroVideo: any;

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
    ViroImage = require("@reactvision/react-viro/dist/components/ViroImage").ViroImage;
    ViroVideo = require("@reactvision/react-viro/dist/components/ViroVideo").ViroVideo;
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
    ViroARTrackingTargets.createTargets(
      Object.fromEntries(
        ARTIE_TARGET_IMAGES.map((target) => [
          target.id,
          {
            source: target.source,
            orientation: "Up",
            physicalHeight: target.physicalHeightMeters,
            physicalWidth: target.physicalWidthMeters,
          },
        ]),
      ),
    );

    hasRegisteredMarkerAssets = true;
  }

  const MarkerScene = () => (
    <ViroARScene>
      <ViroAmbientLight color="#FFFFFF" intensity={800} />
      {ARTIE_TARGET_IMAGES.map((target) => (
        <ViroARImageMarker key={target.id} target={target.id}>
          {DESIGN_ASSET_META.kind !== "unsupported" ? (
            <DesignAssetContent
              assetMeta={DESIGN_ASSET_META}
              uri={REMOTE_DESIGN_ASSET_URI}
              markerWidthMeters={target.physicalWidthMeters}
              markerHeightMeters={target.physicalHeightMeters}
              Viro3DObject={Viro3DObject}
              ViroImage={ViroImage}
              ViroVideo={ViroVideo}
              onStatusChange={setStatusText}
            />
          ) : null}
        </ViroARImageMarker>
      ))}
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
