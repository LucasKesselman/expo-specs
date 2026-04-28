import type { ExpoConfig } from "expo/config";

const appJson = require("./app.json");
const baseExpoConfig = appJson.expo as ExpoConfig;

const embedKey = process.env.ZAPPAR_EMBED_KEY?.trim();
const isZapparEnabled = process.env.EXPO_PUBLIC_ZAPPAR_ENABLED !== "false";

const existingPlugins = baseExpoConfig.plugins ?? [];

const config: ExpoConfig = {
  ...baseExpoConfig,
  plugins: [
    ...existingPlugins,
    [
      "./plugins/withZapparEmbed",
      {
        embedKey,
      },
    ],
  ],
  extra: {
    ...baseExpoConfig.extra,
    zappar: {
      enabled: isZapparEnabled,
      ...(embedKey ? { hasEmbedKey: true } : {}),
    },
  },
};

export default config;
