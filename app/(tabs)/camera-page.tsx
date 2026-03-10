import {
  ZAPPAR_CAMERA_SCRIPT,
  ZAPPAR_HTML_SHELL,
} from "@/lib/zappar-camera-script.generated";
import { useThemeColors } from "@/hooks/useThemeColors";
import { storage } from "@/lib/firebase";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { useCameraPermissions } from "expo-camera";
import { getDownloadURL, ref } from "firebase/storage";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

/** Builds HTML with empty config; config is injected in WebView onLoad to avoid huge base64 in initial HTML. */
function getZapparImageTrackingHtml(): string {
  return ZAPPAR_HTML_SHELL.replace("__CONFIG__", "{}").replaceAll(
    "__SCRIPT__",
    ZAPPAR_CAMERA_SCRIPT
  );
}

function showFoundQRAlert(data: string) {
  Alert.alert("Found QR code", data || "Design QR detected.");
}

export default function CameraPage() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background0 },
        centered: {
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        },
        helperText: {
          color: colors.typography950,
          fontSize: 16,
          textAlign: "center",
          marginBottom: 20,
        },
        helperSubtext: {
          color: colors.typography500,
          fontSize: 14,
          textAlign: "center",
          marginTop: 16,
          paddingHorizontal: 16,
        },
        permissionButton: {
          backgroundColor: colors.primary500,
          paddingVertical: 14,
          paddingHorizontal: 28,
          borderRadius: 12,
        },
        permissionButtonText: {
          color: colors.typography950,
          fontSize: 16,
          fontWeight: "600",
        },
        helperError: {
          color: colors.error500 ?? "#dc2626",
          marginTop: 12,
        },
        webview: { flex: 1, backgroundColor: "transparent" },
        designBanner: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          alignItems: "center",
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: "rgba(0,0,0,0.7)",
          zIndex: 10,
        },
        designBannerText: {
          color: "#fff",
          fontSize: 6,
          fontWeight: "600",
          textAlign: "center",
        },
      }),
    [colors, insets.top],
  );

  const [permission, requestPermission] = useCameraPermissions();
  const [showWebView, setShowWebView] = useState(false);
  const [targetZptBase64, setTargetZptBase64] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [targetLoadError, setTargetLoadError] = useState<string | null>(null);
  const [loadedTargetName, setLoadedTargetName] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  const configRef = useRef<{
    targetZptBase64: string;
    targetDisplayName: string;
    videoUrl: string;
  } | null>(null);

  useEffect(() => {
    if (permission?.granted) setShowWebView(true);
  }, [permission?.granted]);

  useEffect(() => {
    setTargetLoadError(null);
    const zptAsset = Asset.fromModule(
      require("@/assets/targets/target_001.zpt")
    );
    Promise.all([
      zptAsset.downloadAsync().then(async (asset) => {
        const uri = asset.localUri ?? asset.uri;
        return new File(uri).base64();
      }),
      getDownloadURL(ref(storage, "models/model_001.mp4")),
    ])
      .then(([base64, modelUrl]) => {
        setTargetZptBase64(base64);
        setVideoUrl(modelUrl);
      })
      .catch((err) => {
        setTargetLoadError(err?.message ?? "Failed to load target or model");
      });
  }, []);

  // --- WebView message handling ---
  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "targetLoaded" && data.name != null) {
        setLoadedTargetName(data.name);
      }
      if (data.type === "designQR" && data.data != null) {
        showFoundQRAlert(String(data.data));
      }
      if (data.type === "videoError" && data.message != null) {
        Alert.alert(
          "Video failed to load",
          String(data.message) +
            "\n\nIf using Firebase Storage, ensure CORS is set (see firebase/README.md). Or bundle the .mp4 in the app.",
          [{ text: "OK" }]
        );
      }
    } catch {
      // ignore malformed messages
    }
  };

  if (permission === null) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary500} />
        <Text style={styles.helperText}>Checking camera access…</Text>
      </View>
    );
  }

  if (!permission?.granted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.helperText}>
          AR needs camera access. Tap below to allow.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
          activeOpacity={0.8}
        >
          <Text style={styles.permissionButtonText}>Allow camera</Text>
        </TouchableOpacity>
        <Text style={styles.helperSubtext}>
          You’ll see the system permission dialog, then the AR view.
        </Text>
      </View>
    );
  }

  if (!showWebView || !targetZptBase64 || !videoUrl) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary500} />
        {targetLoadError ? (
          <Text style={[styles.helperText, styles.helperError]}>{targetLoadError}</Text>
        ) : (
          <Text style={styles.helperText}>Loading target and model…</Text>
        )}
      </View>
    );
  }

  configRef.current = {
    targetZptBase64: targetZptBase64 as string,
    targetDisplayName: "target_001",
    videoUrl: videoUrl as string,
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{
          html: getZapparImageTrackingHtml(),
          baseUrl: "https://libs.zappar.com/",
        }}
        style={styles.webview}
        originWhitelist={["*"]}
        allowsInlineMediaPlayback
        mediaCapture="granted"
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="compatibility"
        allowsFullscreenVideo
        scrollEnabled={false}
        bounces={false}
        onMessage={handleWebViewMessage}
        onLoad={() => {
          const cfg = configRef.current;
          if (cfg?.targetZptBase64) {
            const script = `window.__ZAPPAR_CONFIG__ = ${JSON.stringify(cfg)};`;
            webViewRef.current?.injectJavaScript(script);
          }
        }}
      />
      <View style={styles.designBanner} pointerEvents="box-none">
        <Text style={styles.designBannerText}>
          Currently Selected Design: {loadedTargetName ?? "___DES-DEFAULT___"}
        </Text>
      </View>
    </View>
  );
}
