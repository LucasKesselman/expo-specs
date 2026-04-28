import type { ZapparLaunchOptions } from "./types";

function env(name: string): string | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function isZapparEnabled(): boolean {
  return env("EXPO_PUBLIC_ZAPPAR_ENABLED") !== "false";
}

export function getDefaultZapparLaunchOptions(): ZapparLaunchOptions {
  return {
    launchDeepLink: env("EXPO_PUBLIC_ZAPPAR_LAUNCH_DEEP_LINK"),
    barColor: env("EXPO_PUBLIC_ZAPPAR_BAR_COLOR") ?? "#000000",
  };
}
