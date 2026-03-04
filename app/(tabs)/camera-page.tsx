import { useThemeColors } from "@/hooks/useThemeColors";
import { storage } from "@/lib/firebase";
import { useCameraPermissions } from "expo-camera";
import { getDownloadURL, ref } from "firebase/storage";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

function getZapparImageTrackingHtml(
  targetZptUrl: string,
  targetDisplayName: string
): string {
  const escapedUrl = targetZptUrl.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const escapedName = targetDisplayName
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    #canvas { display: block; width: 100%; height: 100%; touch-action: none; }
    #flip-btn {
      position: fixed;
      top: calc(env(safe-area-inset-top) + 12px);
      right: 12px;
      width: 44px;
      height: 44px;
      border-radius: 22px;
      background: rgba(0,0,0,0.35);
      border: none;
      cursor: pointer;
      z-index: 10;
      display: none;
      align-items: center;
      justify-content: center;
      -webkit-tap-highlight-color: transparent;
      -webkit-appearance: none;
      appearance: none;
    }
    #flip-btn:active { background: rgba(0,0,0,0.5); }
    #flip-btn svg { width: 24px; height: 24px; }
    #permission-msg {
      position: fixed;
      top: 50%;
      left: 20px;
      right: 20px;
      transform: translateY(-50%);
      color: #fff;
      text-align: center;
      font-family: -apple-system, sans-serif;
      font-size: 16px;
      z-index: 5;
    }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <button id="flip-btn" aria-label="Switch camera">
    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M23 4v6h-6M1 20v-6h6"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  </button>
  <div id="permission-msg">Requesting camera access…</div>
  <script src="https://unpkg.com/three@0.128.0/build/three.min.js"><\/script>
  <script src="https://libs.zappar.com/zappar-threejs/4.3.0/zappar-threejs.js"><\/script>
  <script>
    (function() {
      var canvas = document.getElementById('canvas');
      var permissionMsg = document.getElementById('permission-msg');
      var targetZptUrl = '${escapedUrl}';
      var targetDisplayName = '${escapedName}';

      var scene = new THREE.Scene();
      var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      ZapparThree.glContextSet(renderer.getContext());

      var camera = new ZapparThree.Camera();
      scene.background = camera.backgroundTexture;

      var permissionTimeout = setTimeout(function() {
        if (permissionMsg.textContent === 'Requesting camera access…') {
          permissionMsg.textContent = 'Camera is taking a moment… If nothing happens, close and reopen this tab, or check Settings > Expo Go > Camera.';
        }
      }, 5000);

      var flipBtn = document.getElementById('flip-btn');
      var frontCameraAvailable = false;
      var isFrontCamera = false;

      function checkFrontCameraAndShowButton() {
        try {
          camera.start(true);
          frontCameraAvailable = true;
          camera.start(false);
          isFrontCamera = false;
          flipBtn.style.display = 'flex';
        } catch (e) {
          frontCameraAvailable = false;
        }
      }

      flipBtn.addEventListener('click', function() {
        if (!frontCameraAvailable) return;
        try {
          if (isFrontCamera) {
            camera.start(false);
            isFrontCamera = false;
          } else {
            camera.userCameraMirrorMode = ZapparThree.CameraMirrorMode.Poses;
            camera.start(true);
            isFrontCamera = true;
          }
        } catch (e) {
          frontCameraAvailable = false;
          flipBtn.style.display = 'none';
        }
      });

      ZapparThree.permissionRequestUI().then(function(granted) {
        clearTimeout(permissionTimeout);
        if (granted) {
          camera.start();
          camera.userCameraMirrorMode = ZapparThree.CameraMirrorMode.None;
          permissionMsg.textContent = 'Loading target…';
          setTimeout(checkFrontCameraAndShowButton, 150);

          var imageTracker = new ZapparThree.ImageTracker();
          var imageAnchorGroup = new ZapparThree.ImageAnchorGroup(camera, imageTracker);
          scene.add(imageAnchorGroup);

          var geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
          var material = new THREE.MeshStandardMaterial({ color: 0x007AFF, metalness: 0.2, roughness: 0.6 });
          var cube = new THREE.Mesh(geometry, material);
          imageAnchorGroup.add(cube);

          var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
          dirLight.position.set(1, 2, 3);
          scene.add(dirLight);
          scene.add(new THREE.AmbientLight(0xffffff, 0.4));

          imageTracker.loadTarget(targetZptUrl).then(function() {
            permissionMsg.textContent = 'Point your camera at the target image';
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'targetLoaded', name: targetDisplayName }));
            }
          }).catch(function(err) {
            permissionMsg.textContent = 'Failed to load target: ' + (err && err.message ? err.message : 'Check target file.');
          });

          function animate() {
            requestAnimationFrame(animate);
            camera.updateFrame(renderer);
            renderer.render(scene, camera);
          }
          animate();
        } else {
          permissionMsg.textContent = 'Camera access is needed for AR. Please allow and reload.';
          ZapparThree.permissionDeniedUI();
        }
      }).catch(function(err) {
        clearTimeout(permissionTimeout);
        permissionMsg.textContent = 'Camera error: ' + (err && err.message ? err.message : 'Please allow camera in Settings and try again.');
      });

      window.addEventListener('resize', function() {
        renderer.setSize(window.innerWidth, window.innerHeight);
      });
    })();
  </script>
</body>
</html>
`;
}

/** Camera/AR tab: requests permission then loads Zappar AR WebView (place-a-cube). */
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
  const [targetZptUrl, setTargetZptUrl] = useState<string | null>(null);
  const [targetLoadError, setTargetLoadError] = useState<string | null>(null);
  const [loadedTargetName, setLoadedTargetName] = useState<string | null>(null);

  useEffect(() => {
    if (permission?.granted) setShowWebView(true);
  }, [permission?.granted]);

  useEffect(() => {
    setTargetLoadError(null);
    const targetRef = ref(storage, "targets/target_001.zpt");
    getDownloadURL(targetRef)
      .then((url) => setTargetZptUrl(url))
      .catch((err) => {
        setTargetLoadError(err?.message ?? "Failed to load target from Storage");
      });
  }, []);

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

  if (!showWebView || !targetZptUrl) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary500} />
        {targetLoadError ? (
          <Text style={[styles.helperText, styles.helperError]}>
            {targetLoadError}
          </Text>
        ) : !targetZptUrl && showWebView ? (
          <Text style={styles.helperText}>Loading target from Storage…</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{
          html: getZapparImageTrackingHtml(targetZptUrl, "target_001"),
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
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "targetLoaded" && data.name != null) {
              setLoadedTargetName(data.name);
            }
          } catch {
            // ignore malformed messages
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
