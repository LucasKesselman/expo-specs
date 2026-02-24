import { useEffect, useState } from "react";
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

      ZapparThree.permissionRequestUI().then(function(granted) {
        clearTimeout(permissionTimeout);
        if (granted) {
          camera.start();
          permissionMsg.textContent = '';
          placeBtn.style.display = 'block';
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

export default function CameraPage() {
  const [permission, requestPermission] = useCameraPermissions();
  const [showWebView, setShowWebView] = useState(false);

  useEffect(() => {
    if (permission?.granted) setShowWebView(true);
  }, [permission?.granted]);

  if (permission === null) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
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
        <ActivityIndicator size="large" color="#007AFF" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  helperText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  helperSubtext: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 16,
  },
  permissionButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
