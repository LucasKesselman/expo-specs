import type { ExpoConfig } from "expo/config";

const appJson = require("./app.json");
const baseExpoConfig = appJson.expo as ExpoConfig;

const config: ExpoConfig = {
  ...baseExpoConfig,
  plugins: [...(baseExpoConfig.plugins ?? []), "expo-video"],
};

export default config;
