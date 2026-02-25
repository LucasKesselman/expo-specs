import { useThemeColors } from "@/hooks/useThemeColors";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { useCameraPermissions } from "expo-camera";

const ZAPPAR_AR_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    #canvas { display: block; width: 100%; height: 100%; touch-action: none; }
    #place-btn {
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      padding: 14px 28px;
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      background: #007AFF;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      z-index: 10;
      opacity: 0.9;
    }
    #place-btn:active { opacity: 1; }
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
  <button id="place-btn" style="display:none;">Tap to place object</button>
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
      var placeBtn = document.getElementById('place-btn');
      var permissionMsg = document.getElementById('permission-msg');

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
          permissionMsg.textContent = '';
          placeBtn.style.display = 'block';
          setTimeout(checkFrontCameraAndShowButton, 150);
        } else {
          permissionMsg.textContent = 'Camera access is needed for AR. Please allow and reload.';
          ZapparThree.permissionDeniedUI();
        }
      }).catch(function(err) {
        clearTimeout(permissionTimeout);
        permissionMsg.textContent = 'Camera error: ' + (err && err.message ? err.message : 'Please allow camera in Settings and try again.');
      });

      var instantWorldTracker = new ZapparThree.InstantWorldTracker();
      var instantAnchorGroup = new ZapparThree.InstantWorldAnchorGroup(camera, instantWorldTracker);
      scene.add(instantAnchorGroup);

      var geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
      var material = new THREE.MeshStandardMaterial({ color: 0x007AFF, metalness: 0.2, roughness: 0.6 });
      var cube = new THREE.Mesh(geometry, material);
      instantAnchorGroup.add(cube);

      var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(1, 2, 3);
      scene.add(dirLight);
      scene.add(new THREE.AmbientLight(0xffffff, 0.4));

      var hasPlaced = false;
      placeBtn.addEventListener('click', function() { hasPlaced = true; placeBtn.style.display = 'none'; });

      function animate() {
        requestAnimationFrame(animate);
        camera.updateFrame(renderer);
        if (!hasPlaced) instantWorldTracker.setAnchorPoseFromCameraOffset(0, 0, -5);
        renderer.render(scene, camera);
      }
      animate();

      window.addEventListener('resize', function() {
        renderer.setSize(window.innerWidth, window.innerHeight);
      });
    })();
  </script>
</body>
</html>
`;

/** Camera/AR tab: requests permission then loads Zappar AR WebView (place-a-cube). */
export default function CameraPage() {
  const colors = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background0 },
        centered: { justifyContent: "center", alignItems: "center", padding: 24 },
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
        webview: { flex: 1, backgroundColor: "transparent" },
      }),
    [colors]
  );
  const [permission, requestPermission] = useCameraPermissions();
  const [showWebView, setShowWebView] = useState(false);

  useEffect(() => {
    if (permission?.granted) setShowWebView(true);
  }, [permission?.granted]);

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

  if (!showWebView) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary500} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{
          html: ZAPPAR_AR_HTML,
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
      />
    </View>
  );
}
