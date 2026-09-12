import type { ExpoConfig } from "expo/config";

const appJson = require("./app.json");
const baseExpoConfig = appJson.expo as ExpoConfig;

/**
 * Passed through so expo-audio's config plugin cannot overwrite it with its
 * generic default. Setting it to `false` deletes the key instead of leaving
 * the existing value alone.
 */
const microphonePermission = baseExpoConfig.ios?.infoPlist
  ?.NSMicrophoneUsageDescription as string | undefined;

const config: ExpoConfig = {
  ...baseExpoConfig,
  plugins: [
    ...(baseExpoConfig.plugins ?? []),
    "expo-video",
    // expo-audio is only used for the AR audio session, never for recording,
    // so it must not add Android's RECORD_AUDIO permission.
    ["expo-audio", { microphonePermission, recordAudioAndroid: false }],
  ],
};

export default config;
