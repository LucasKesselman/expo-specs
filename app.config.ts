import type { ExpoConfig } from "expo/config";

const appJson = require("./app.json");
const baseExpoConfig = appJson.expo as ExpoConfig;

const config: ExpoConfig = {
  ...baseExpoConfig,
};

export default config;
