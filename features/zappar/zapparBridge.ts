import { NativeModules, Platform } from "react-native";

import type { ZapparLaunchOptions, ZapparLaunchResult } from "./types";

type ZapparNativeModule = {
  startZappar: (optionsJson: string) => Promise<void> | void;
};

function getNativeModule(): ZapparNativeModule | null {
  const moduleValue = NativeModules.ZapparModule as ZapparNativeModule | undefined;
  return moduleValue ?? null;
}

function mapNativeError(error: unknown): ZapparLaunchResult {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();
  const isPermissionError =
    lowerMessage.includes("permission") || lowerMessage.includes("authorized");

  if (isPermissionError) {
    return {
      ok: false,
      code: "PERMISSION_DENIED",
      message,
    };
  }

  return {
    ok: false,
    code: "NATIVE_ERROR",
    message,
  };
}

export function isZapparModuleAvailable(): boolean {
  return getNativeModule() !== null;
}

export async function startZappar(
  options: ZapparLaunchOptions = {},
): Promise<ZapparLaunchResult> {
  if (Platform.OS !== "ios") {
    return {
      ok: false,
      code: "PLATFORM_UNSUPPORTED",
      message: "Zappar AR camera is currently only enabled on iOS.",
    };
  }

  const moduleValue = getNativeModule();
  if (!moduleValue) {
    return {
      ok: false,
      code: "UNAVAILABLE",
      message:
        "Zappar native module is unavailable. Rebuild with the Zappar native integration and open in Expo dev client.",
    };
  }

  try {
    const serializedOptions = JSON.stringify(options ?? {});
    moduleValue.startZappar(serializedOptions);
    return { ok: true };
  } catch (error) {
    return mapNativeError(error);
  }
}
