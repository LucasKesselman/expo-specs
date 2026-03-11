/**
 * Zappar AR + QR camera script. Runs inside the camera WebView.
 * Config is provided by React Native via window.__ZAPPAR_CONFIG__ (set before this script runs).
 *
 * After editing this file, run: npm run generate:zappar-script
 * to update lib/zappar-camera-script.generated.ts used by the WebView.
 */
(function () {
  function getConfig() {
    return window.__ZAPPAR_CONFIG__ || {};
  }
  var config = getConfig();
  var targetZptBase64 = config.targetZptBase64 || "";
  var targetDisplayName = config.targetDisplayName || "";
  var imageUrl = config.imageUrl || "";

  function base64ToArrayBuffer(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  var QR_SCAN_SIZE = 256;
  var QR_COOLDOWN_MS = 2000;
  var QR_SCAN_EVERY_N_FRAMES = 3;
  var MESSAGE_TYPE_TARGET_LOADED = "targetLoaded";
  var MESSAGE_TYPE_DESIGN_QR = "designQR";

  var canvas = document.getElementById("canvas");
  var permissionMsg = document.getElementById("permission-msg");
  var flipBtn = document.getElementById("flip-btn");

  var gl = canvas.getContext("webgl", {
    alpha: true,
    depth: true,
    stencil: true,
    antialias: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
  });
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, context: gl });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  ZapparThree.glContextSet(renderer.getContext());

  var camera = new ZapparThree.Camera();
  var scene = new THREE.Scene();
  scene.background = camera.backgroundTexture;

  var permissionTimeout = setTimeout(function () {
    if (permissionMsg.textContent === "Requesting camera access…") {
      permissionMsg.textContent =
        "Camera is taking a moment… If nothing happens, close and reopen this tab, or check Settings > Expo Go > Camera.";
    }
  }, 5000);

  var frontCameraAvailable = false;
  var isFrontCamera = false;

  function checkFrontCameraAndShowButton() {
    try {
      camera.start(true);
      frontCameraAvailable = true;
      camera.start(false);
      isFrontCamera = false;
      flipBtn.style.display = "flex";
    } catch (e) {
      frontCameraAvailable = false;
    }
  }

  flipBtn.addEventListener("click", function () {
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
      flipBtn.style.display = "none";
    }
  });

  ZapparThree.permissionRequestUI()
    .then(function (granted) {
      clearTimeout(permissionTimeout);
      if (!granted) {
        permissionMsg.textContent =
          "Camera access is needed for AR. Please allow and reload.";
        ZapparThree.permissionDeniedUI();
        return;
      }

      camera.start();
      camera.userCameraMirrorMode = ZapparThree.CameraMirrorMode.None;
      permissionMsg.textContent = "Loading target…";
      setTimeout(checkFrontCameraAndShowButton, 150);

      var imageTracker = new ZapparThree.ImageTracker();
      var imageAnchorGroup = new ZapparThree.ImageAnchorGroup(
        camera,
        imageTracker
      );
      scene.add(imageAnchorGroup);

      function notifyImageError(msg) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ type: "imageError", message: msg || "Unknown" })
          );
        }
      }
      function notifyDesignImageLoaded(fileName) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: "designImageLoaded",
              fileName: fileName || "design",
            })
          );
        }
      }
      var urlToLoad = imageUrl || (getConfig() && getConfig().imageUrl) || "";
      var textureLoader = new THREE.TextureLoader();
      textureLoader.setCrossOrigin("anonymous");
      var imageTexture = textureLoader.load(
        urlToLoad,
        function () {
          var pathPart = urlToLoad.split("?")[0];
          var fileName = decodeURIComponent(
            pathPart.split("/").pop() || "design"
          );
          notifyDesignImageLoaded(fileName);
        },
        undefined,
        function () {
          notifyImageError("Design image load failed");
        }
      );
      imageTexture.minFilter = THREE.LinearFilter;
      imageTexture.magFilter = THREE.LinearFilter;
      imageTexture.format = THREE.RGBAFormat;
      var imagePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: imageTexture,
          side: THREE.DoubleSide,
        })
      );
      imageAnchorGroup.add(imagePlane);

      window.__ZAPPAR_UPDATE_DESIGN__ = function (newImageUrl) {
        if (!newImageUrl || !imagePlane) return;
        var loader = new THREE.TextureLoader();
        loader.setCrossOrigin("anonymous");
        loader.load(
          newImageUrl,
          function (newTexture) {
            newTexture.minFilter = THREE.LinearFilter;
            newTexture.magFilter = THREE.LinearFilter;
            newTexture.format = THREE.RGBAFormat;
            var oldTexture = imagePlane.material.map;
            imagePlane.material.map = newTexture;
            imagePlane.material.needsUpdate = true;
            if (oldTexture && oldTexture !== newTexture) oldTexture.dispose();
            var pathPart = newImageUrl.split("?")[0];
            var fileName = decodeURIComponent(
              pathPart.split("/").pop() || "design"
            );
            notifyDesignImageLoaded(fileName);
          },
          undefined,
          function () {
            notifyImageError("Design image swap failed");
          }
        );
      };

      var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(1, 2, 3);
      scene.add(dirLight);
      scene.add(new THREE.AmbientLight(0xffffff, 0.4));

      function tryGetTargetPayload() {
        var cfg = getConfig();
        var b64 = (cfg && cfg.targetZptBase64) || "";
        return b64 ? base64ToArrayBuffer(b64) : null;
      }
      var targetPayload = tryGetTargetPayload();
      if (!targetPayload) {
        permissionMsg.textContent = "Waiting for target…";
        var waitStart = Date.now();
        var checkInterval = setInterval(function () {
          targetPayload = tryGetTargetPayload();
          if (targetPayload || Date.now() - waitStart > 5000) {
            clearInterval(checkInterval);
            if (!targetPayload) {
              permissionMsg.textContent = "No target data. Check app config.";
              return;
            }
            runTracker();
          }
        }, 100);
        return;
      }
      runTracker();
      function runTracker() {
      imageTracker
        .loadTarget(targetPayload)
        .then(function () {
          permissionMsg.textContent = "Point your camera at the target image";
          if (
            window.ReactNativeWebView &&
            window.ReactNativeWebView.postMessage
          ) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: MESSAGE_TYPE_TARGET_LOADED,
                name: targetDisplayName,
              })
            );
          }
        })
        .catch(function (err) {
          permissionMsg.textContent =
            "Failed to load target: " +
            (err && err.message ? err.message : "Check target file.");
        });
      }

      var qrFrameCount = 0;
      var qrLastScannedTime = 0;
      var qrLastScannedData = "";

      var qrRenderTarget = new THREE.WebGLRenderTarget(
        QR_SCAN_SIZE,
        QR_SCAN_SIZE,
        {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
          type: THREE.UnsignedByteType,
        }
      );
      var qrScene = new THREE.Scene();
      var qrCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      var qrPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshBasicMaterial({
          map: camera.backgroundTexture,
          depthTest: false,
          depthWrite: false,
        })
      );
      qrScene.add(qrPlane);

      function notifyQRCode(data) {
        var now = Date.now();
        if (
          now - qrLastScannedTime >= QR_COOLDOWN_MS ||
          data !== qrLastScannedData
        ) {
          qrLastScannedTime = now;
          qrLastScannedData = data;
          if (
            window.ReactNativeWebView &&
            window.ReactNativeWebView.postMessage
          ) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({ type: MESSAGE_TYPE_DESIGN_QR, data: data })
            );
          }
        }
      }

      function tryScanQR() {
        if (typeof jsQR === "undefined") return;
        qrFrameCount++;
        if (qrFrameCount % QR_SCAN_EVERY_N_FRAMES !== 0) return;

        renderer.setRenderTarget(qrRenderTarget);
        renderer.clear();
        renderer.render(qrScene, qrCamera);

        var glContext = renderer.getContext();
        var w = QR_SCAN_SIZE;
        var h = QR_SCAN_SIZE;
        var raw = new Uint8Array(w * h * 4);
        glContext.readPixels(
          0,
          0,
          w,
          h,
          glContext.RGBA,
          glContext.UNSIGNED_BYTE,
          raw
        );
        renderer.setRenderTarget(null);

        var flipped = new Uint8ClampedArray(w * h * 4);
        for (var row = 0; row < h; row++) {
          var srcRow = h - 1 - row;
          for (var col = 0; col < w * 4; col++) {
            flipped[row * w * 4 + col] = raw[srcRow * w * 4 + col];
          }
        }

        var code = jsQR(flipped, w, h);
        if (code && code.data) notifyQRCode(code.data);
      }

      function animate() {
        requestAnimationFrame(animate);
        camera.updateFrame(renderer);
        // Only show the design when the target image is in view
        imageAnchorGroup.visible =
          imageTracker.visible && imageTracker.visible.size > 0;
        tryScanQR();
        renderer.render(scene, camera);
      }
      animate();
    })
    .catch(function (err) {
      clearTimeout(permissionTimeout);
      permissionMsg.textContent =
        "Camera error: " +
        (err && err.message ? err.message : "Please allow camera in Settings and try again.");
    });

  window.addEventListener("resize", function () {
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
