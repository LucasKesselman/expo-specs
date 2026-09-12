import { setAudioModeAsync } from "expo-audio";
import { Platform } from "react-native";

/**
 * iOS honors the ringer switch for the default `ambient` audio session, which
 * silences ViroVideo playback. `playsInSilentMode` moves the session to
 * `playback` so AR design audio is audible regardless of the ringer.
 *
 * `allowsRecording` must be true for AR video capture (Viro records the
 * renderer plus microphone), but `playAndRecord` can route playback to the
 * earpiece, so it is only enabled while a recording is in progress.
 */
const IS_SUPPORTED = Platform.OS === "ios" || Platform.OS === "android";

async function applyAudioMode(mode: {
  playsInSilentMode?: boolean;
  allowsRecording?: boolean;
}): Promise<void> {
  if (!IS_SUPPORTED) {
    return;
  }

  try {
    await setAudioModeAsync({ interruptionMode: "mixWithOthers", ...mode });
  } catch {
    // A failed session change must never break the AR scene.
  }
}

/** Play AR design audio even when the device is in silent mode. */
export function enableArPlaybackAudio(): Promise<void> {
  return applyAudioMode({ playsInSilentMode: true, allowsRecording: false });
}

/** Grant the session microphone access for the duration of an AR capture. */
export function setArRecordingAudioAllowed(allowed: boolean): Promise<void> {
  return applyAudioMode({ playsInSilentMode: true, allowsRecording: allowed });
}

/** Hand the ringer switch back to the rest of the app when AR closes. */
export function restoreDefaultAudioMode(): Promise<void> {
  return applyAudioMode({ playsInSilentMode: false, allowsRecording: false });
}
