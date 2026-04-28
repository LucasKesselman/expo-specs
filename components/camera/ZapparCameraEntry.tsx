import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

import {
  getDefaultZapparLaunchOptions,
  isZapparEnabled,
  isZapparModuleAvailable,
  startZappar,
  type ZapparLaunchResult,
} from "../../features/zappar";

const UNAVAILABLE_HELP_TEXT =
  "AR module not detected. Build and run with Expo dev client after native Zappar setup.";

function getStatusMessage(result: ZapparLaunchResult | null): string {
  if (!result) {
    return "Ready to launch AR camera.";
  }

  if (result.ok) {
    return "Launching Zappar AR camera...";
  }

  if (result.code === "PERMISSION_DENIED") {
    return "Camera permission was denied by iOS. Allow camera access in Settings and try again.";
  }

  if (result.code === "UNAVAILABLE") {
    return UNAVAILABLE_HELP_TEXT;
  }

  return result.message;
}

export function ZapparCameraEntry() {
  const [isLaunching, setIsLaunching] = useState(false);
  const [lastResult, setLastResult] = useState<ZapparLaunchResult | null>(null);

  const featureEnabled = isZapparEnabled();
  const moduleAvailable = isZapparModuleAvailable();
  const canLaunch = featureEnabled && moduleAvailable && !isLaunching;
  const statusMessage = useMemo(() => getStatusMessage(lastResult), [lastResult]);

  const handleLaunch = useCallback(async () => {
    setIsLaunching(true);
    const result = await startZappar(getDefaultZapparLaunchOptions());
    if (!result.ok) {
      console.warn("[zappar] launch failed", result.code, result.message);
    }
    setLastResult(result);
    setIsLaunching(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const subscription = AppState.addEventListener("change", (nextState) => {
        if (nextState === "active") {
          setIsLaunching(false);
        }
      });

      return () => {
        subscription.remove();
        setIsLaunching(false);
      };
    }, []),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AR Camera</Text>
      <Text style={styles.subtitle}>Tap to launch Zappar in native iOS mode.</Text>

      <Pressable
        style={[styles.launchButton, !canLaunch && styles.launchButtonDisabled]}
        onPress={handleLaunch}
        disabled={!canLaunch}
      >
        {isLaunching ? (
          <ActivityIndicator color="#111827" />
        ) : (
          <Text style={styles.launchButtonLabel}>Open AR Camera</Text>
        )}
      </Pressable>

      {!featureEnabled && (
        <Text style={styles.helpText}>
          Zappar feature is disabled. Set `EXPO_PUBLIC_ZAPPAR_ENABLED=true` to enable launch.
        </Text>
      )}

      {featureEnabled && !moduleAvailable && (
        <Text style={styles.helpText}>{UNAVAILABLE_HELP_TEXT}</Text>
      )}

      <Text style={styles.statusText}>{statusMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  title: {
    color: "#E2E8F0",
    fontSize: 24,
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
  launchButton: {
    marginTop: 8,
    minWidth: 220,
    borderRadius: 999,
    backgroundColor: "#F87171",
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  launchButtonDisabled: {
    opacity: 0.5,
  },
  launchButtonLabel: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
  helpText: {
    color: "#FCA5A5",
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 320,
    textAlign: "center",
  },
  statusText: {
    marginTop: 2,
    color: "#CBD5E1",
    fontSize: 13,
    textAlign: "center",
    maxWidth: 320,
  },
});
