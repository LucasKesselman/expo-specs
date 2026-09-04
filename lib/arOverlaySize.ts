import { createVideoPlayer } from "expo-video";
import { Image } from "react-native";

const PIXEL_SIZE_TIMEOUT_MS = 12_000;

export type PixelSize = {
  width: number;
  height: number;
};

const inFlightPixelSize = new Map<string, Promise<PixelSize | null>>();

export function toPixelSize(width?: number | null, height?: number | null): PixelSize | null {
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  return { width, height };
}

/**
 * Size an AR overlay so it fits entirely on the tracking marker without
 * stretching. Portrait assets stay portrait; landscape assets stay landscape.
 */
export function fitOverlayToMarker(
  markerWidthMeters: number,
  markerHeightMeters: number,
  assetWidthPx?: number | null,
  assetHeightPx?: number | null,
): { widthMeters: number; heightMeters: number } {
  const pixelSize = toPixelSize(assetWidthPx, assetHeightPx);
  if (!pixelSize) {
    return { widthMeters: markerWidthMeters, heightMeters: markerHeightMeters };
  }

  const assetAspect = pixelSize.width / pixelSize.height;
  const markerAspect = markerWidthMeters / markerHeightMeters;

  if (assetAspect >= markerAspect) {
    return {
      widthMeters: markerWidthMeters,
      heightMeters: markerWidthMeters / assetAspect,
    };
  }

  return {
    widthMeters: markerHeightMeters * assetAspect,
    heightMeters: markerHeightMeters,
  };
}

function pixelSizeFromTrack(track: { size?: { width?: number; height?: number } } | null | undefined): PixelSize | null {
  return toPixelSize(track?.size?.width, track?.size?.height);
}

function getImagePixelSize(uri: string): Promise<PixelSize | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: PixelSize | null) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve(value);
    };

    const timeout = setTimeout(() => finish(null), PIXEL_SIZE_TIMEOUT_MS);

    Image.getSize(
      uri,
      (width, height) => finish(toPixelSize(width, height)),
      () => finish(null),
    );
  });
}

async function getVideoPixelSize(uri: string): Promise<PixelSize | null> {
  const player = createVideoPlayer(uri);
  try {
    return await new Promise((resolve) => {
      let settled = false;
      const finish = (value: PixelSize | null) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        sourceSub.remove();
        statusSub.remove();
        trackSub.remove();
        resolve(value);
      };

      const timeout = setTimeout(() => finish(null), PIXEL_SIZE_TIMEOUT_MS);

      const sourceSub = player.addListener("sourceLoad", ({ availableVideoTracks }) => {
        const fromTracks = availableVideoTracks
          .map((track) => pixelSizeFromTrack(track))
          .find((size) => size != null);
        const size = fromTracks ?? pixelSizeFromTrack(player.videoTrack);
        if (size) {
          finish(size);
        }
      });

      const trackSub = player.addListener("videoTrackChange", ({ videoTrack }) => {
        const size = pixelSizeFromTrack(videoTrack);
        if (size) {
          finish(size);
        }
      });

      const statusSub = player.addListener("statusChange", ({ status }) => {
        if (status === "error") {
          finish(null);
        }
      });
    });
  } catch {
    return null;
  } finally {
    player.release();
  }
}

export function getDesignAssetPixelSize(
  kind: "image" | "video",
  uri: string,
): Promise<PixelSize | null> {
  const cacheKey = `${kind}:${uri}`;
  const cached = inFlightPixelSize.get(cacheKey);
  if (cached) {
    return cached;
  }

  const pending = kind === "video" ? getVideoPixelSize(uri) : getImagePixelSize(uri);
  inFlightPixelSize.set(cacheKey, pending);
  return pending;
}
