export type ZapparLaunchOptions = {
  launchDeepLink?: string;
  barColor?: string;
};

export type ZapparLaunchErrorCode =
  | "UNAVAILABLE"
  | "PLATFORM_UNSUPPORTED"
  | "INVALID_OPTIONS"
  | "PERMISSION_DENIED"
  | "NATIVE_ERROR";

export type ZapparLaunchResult =
  | { ok: true }
  | { ok: false; code: ZapparLaunchErrorCode; message: string };
