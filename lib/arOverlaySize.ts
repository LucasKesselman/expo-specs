import * as VideoThumbnails from "expo-video-thumbnails";
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
  try {
    const thumbnail = await Promise.race([
      VideoThumbnails.getThumbnailAsync(uri, { time: 0, quality: 0.1 }).catch(() => null),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), PIXEL_SIZE_TIMEOUT_MS);
      }),
    ]);
    if (!thumbnail) {
      return null;
    }
    return toPixelSize(thumbnail.width, thumbnail.height);
  } catch {
    return null;
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
