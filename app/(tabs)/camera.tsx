import { useFocusEffect } from "@react-navigation/native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ViroCameraScene } from "../../components/camera/ViroCameraScene";
import { useSelectedDigitalDesign } from "../../contexts/SelectedDigitalDesignContext";
import { resolveDesignAssetUrl } from "../../lib/resolveDesignAssetUrl";
import {
  loadGarmentAndDigitalDesign,
  normalizeGarmentIdFromQrPayload,
} from "../../lib/resolveGarmentDigitalDesign";

const QR_SCAN_THROTTLE_MS = 2000;

type CameraPhase = "scan" | "resolving" | "ar" | "error";

export default function CameraTabScreen() {
  const { selectDesign } = useSelectedDigitalDesign();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<CameraPhase>("scan");
  const [statusText, setStatusText] = useState("Scan a garment QR code.");
  const [designAssetUri, setDesignAssetUri] = useState<string | null>(null);
  const [sceneInstanceKey, setSceneInstanceKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lastScanAtRef = useRef(0);
  const lastGarmentIdRef = useRef<string | null>(null);
  const isHandlingScanRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setSceneInstanceKey((previous) => previous + 1);
    }, []),
  );

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const handleRescan = useCallback(() => {
    lastGarmentIdRef.current = null;
    lastScanAtRef.current = 0;
    isHandlingScanRef.current = false;
    setDesignAssetUri(null);
    setErrorMessage(null);
    setStatusText("Scan a garment QR code.");
    setPhase("scan");
  }, []);

  const handleBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (phase !== "scan" || isHandlingScanRef.current) {
        return;
      }

      const now = Date.now();
      if (now - lastScanAtRef.current < QR_SCAN_THROTTLE_MS) {
        return;
      }
      lastScanAtRef.current = now;

      const garmentId = normalizeGarmentIdFromQrPayload(result.data ?? "");
      if (!garmentId) {
        setStatusText("Invalid QR code payload.");
        return;
      }

      if (garmentId === lastGarmentIdRef.current) {
        return;
      }

      isHandlingScanRef.current = true;
      setPhase("resolving");
      setErrorMessage(null);
      setStatusText(`Looking up garment ${garmentId}...`);

      try {
        const garmentResult = await loadGarmentAndDigitalDesign(garmentId);
        if (!garmentResult.ok) {
          setErrorMessage(garmentResult.error);
          setStatusText(garmentResult.error);
          setPhase("scan");
          return;
        }

        await selectDesign(garmentResult.design);
        lastGarmentIdRef.current = garmentId;
        setStatusText(`Loading AR asset for ${garmentResult.design.name}...`);

        const assetUrl = await resolveDesignAssetUrl(garmentResult.design.sourceDocId);
        setDesignAssetUri(assetUrl);
        setSceneInstanceKey((previous) => previous + 1);
        setStatusText("AR ready.");
        setPhase("ar");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to resolve design asset.";
        setErrorMessage(message);
        setStatusText(message);
        setPhase("scan");
      } finally {
        isHandlingScanRef.current = false;
      }
    },
    [phase, selectDesign],
  );

  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Camera requires iOS or Android.</Text>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#F9FAFB" />
        <Text style={styles.subtitle}>Checking camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Camera permission is required</Text>
        <Text style={styles.subtitle}>Allow camera access to scan garment QR codes.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void requestPermission()}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>Grant permission</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === "ar" && designAssetUri) {
    return (
      <ViroCameraScene
        key={`viro-camera-${sceneInstanceKey}-${designAssetUri}`}
        designAssetUri={designAssetUri}
        onRescan={handleRescan}
      />
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={phase === "scan" ? (result) => void handleBarcodeScanned(result) : undefined}
      />
      <View pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.scanFrame} />
        <View style={styles.bottomPanel}>
          {phase === "resolving" ? <ActivityIndicator color="#F9FAFB" /> : null}
          <Text style={styles.statusText}>{statusText}</Text>
          {errorMessage && phase === "scan" ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
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
  centered: {
    flex: 1,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    color: "#E2E8F0",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 300,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.86,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 72,
    paddingBottom: 48,
    paddingHorizontal: 20,
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: "rgba(249,250,251,0.85)",
    borderRadius: 18,
    backgroundColor: "transparent",
  },
  bottomPanel: {
    alignItems: "center",
    gap: 10,
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
    maxWidth: 320,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 12,
    textAlign: "center",
    maxWidth: 300,
  },
});
