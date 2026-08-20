import { useFocusEffect } from "@react-navigation/native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useRouter } from "expo-router";
import { httpsCallable } from "firebase/functions";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../contexts/AuthContext";
import { useGarmentNicknames } from "../contexts/GarmentNicknamesContext";
import { functions } from "../lib/firebase";
import { normalizeGarmentIdFromQrPayload } from "../lib/resolveGarmentDigitalDesign";

const QR_SCAN_THROTTLE_MS = 2000;

type LinkPhase = "scan" | "linking" | "success" | "error";

export default function LinkGarmentScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { setNickname } = useGarmentNicknames();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<LinkPhase>("scan");
  const [statusText, setStatusText] = useState("Scan a garment QR code to claim ownership.");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [linkedGarmentId, setLinkedGarmentId] = useState<string | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [nicknameNotice, setNicknameNotice] = useState<string | null>(null);

  const lastScanAtRef = useRef(0);
  const isHandlingScanRef = useRef(false);
  const nicknameNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      router.replace("/(auth)/landing");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    return () => {
      if (nicknameNoticeTimeoutRef.current) {
        clearTimeout(nicknameNoticeTimeoutRef.current);
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (phase === "success") {
        return;
      }
      isHandlingScanRef.current = false;
      lastScanAtRef.current = 0;
    }, [phase]),
  );

  const handleRescan = useCallback(() => {
    isHandlingScanRef.current = false;
    lastScanAtRef.current = 0;
    setLinkedGarmentId(null);
    setNicknameDraft("");
    setNicknameNotice(null);
    if (nicknameNoticeTimeoutRef.current) {
      clearTimeout(nicknameNoticeTimeoutRef.current);
      nicknameNoticeTimeoutRef.current = null;
    }
    setErrorMessage(null);
    setStatusText("Scan a garment QR code to claim ownership.");
    setPhase("scan");
  }, []);

  const handleSaveNickname = useCallback(async () => {
    if (!linkedGarmentId) {
      return;
    }

    setIsSavingNickname(true);
    try {
      await setNickname(linkedGarmentId, nicknameDraft);
      if (nicknameDraft.trim()) {
        setNicknameNotice("New Nickname Set");
        if (nicknameNoticeTimeoutRef.current) {
          clearTimeout(nicknameNoticeTimeoutRef.current);
        }
        nicknameNoticeTimeoutRef.current = setTimeout(() => {
          setNicknameNotice(null);
          nicknameNoticeTimeoutRef.current = null;
        }, 10_000);
      }
    } finally {
      setIsSavingNickname(false);
    }
  }, [linkedGarmentId, nicknameDraft, setNickname]);

  const handleBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (phase !== "scan" || isHandlingScanRef.current || !user) {
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

      isHandlingScanRef.current = true;
      setPhase("linking");
      setErrorMessage(null);
      setStatusText(`Linking garment ${garmentId}...`);

      try {
        const linkGarment = httpsCallable<{ garmentId: string }, { garmentId: string; owner: string }>(
          functions,
          "linkGarment",
        );
        const response = await linkGarment({ garmentId });
        const linkedId = response.data.garmentId;
        setLinkedGarmentId(linkedId);
        setStatusText("Garment linked successfully.");
        setPhase("success");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to link garment. Please try again.";
        setErrorMessage(message);
        setStatusText(message);
        setPhase("error");
      } finally {
        isHandlingScanRef.current = false;
      }
    },
    [phase, user],
  );

  if (authLoading || !user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#F9FAFB" />
        <Text style={styles.subtitle}>Checking account access...</Text>
      </View>
    );
  }

  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Link Garment requires iOS or Android.</Text>
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

  if (phase === "success" && linkedGarmentId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Garment linked</Text>
        <Text style={styles.subtitle}>
          Give this garment a nickname so it is easier to find in your wardrobe.
        </Text>
        <TextInput
          value={nicknameDraft}
          onChangeText={setNicknameDraft}
          placeholder="Nickname"
          placeholderTextColor="#6B7280"
          style={styles.nicknameInput}
          returnKeyType="done"
          autoCapitalize="words"
          onSubmitEditing={() => {
            void handleSaveNickname();
          }}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => void handleSaveNickname()}
          disabled={isSavingNickname}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || isSavingNickname) && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {isSavingNickname ? "Saving..." : "Save nickname"}
          </Text>
        </Pressable>
        {nicknameNotice ? <Text style={styles.successText}>{nicknameNotice}</Text> : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace(`/garment/${linkedGarmentId}`)}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonText}>View garment</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={handleRescan}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonText}>Scan another</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(tabs)/wardrobe")}
          style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={
          phase === "scan" ? (result) => void handleBarcodeScanned(result) : undefined
        }
      />
      <View pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.scanFrame} />
        <View style={styles.bottomPanel}>
          {phase === "linking" ? <ActivityIndicator color="#F9FAFB" /> : null}
          <Text style={styles.statusText}>{statusText}</Text>
          {phase === "error" && errorMessage ? (
            <>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={handleRescan}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.primaryButtonText}>Scan again</Text>
              </Pressable>
            </>
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
  nicknameInput: {
    marginTop: 8,
    width: "100%",
    maxWidth: 300,
    backgroundColor: "#030712",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  successText: {
    color: "#86EFAC",
    fontSize: 13,
    fontWeight: "600",
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
  secondaryButton: {
    marginTop: 4,
    backgroundColor: "#1F2937",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#374151",
  },
  secondaryButtonText: {
    color: "#E5E7EB",
    fontSize: 15,
    fontWeight: "600",
  },
  skipButton: {
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  skipButtonText: {
    color: "#9CA3AF",
    fontSize: 14,
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
