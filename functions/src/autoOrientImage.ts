import sharp from "sharp";

const RASTER_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);

export const ORIENTATION_NORMALIZED_METADATA_KEY = "marketplaceAssetOrientationNormalized";

/** Staging-upload flag from the app after `normalizeImageForUpload`. Must match the client constant. */
export const STAGED_ORIENTATION_NORMALIZED_METADATA_KEY = "orientationNormalized";

export type AutoOrientOutputFormat = "jpeg" | "png" | "webp";

export type AutoOrientedImage = {
  buffer: Buffer;
  contentType: string;
  format: AutoOrientOutputFormat;
  sourceOrientation: number | undefined;
  width: number;
  height: number;
};

export function extensionFromPath(path: string): string {
  const slashIndex = path.lastIndexOf("/");
  const fileName = slashIndex >= 0 ? path.slice(slashIndex + 1) : path;
  const queryIndex = fileName.indexOf("?");
  const withoutQuery = queryIndex >= 0 ? fileName.slice(0, queryIndex) : fileName;
  const dotIndex = withoutQuery.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === withoutQuery.length - 1) {
    return "";
  }

  const extension = withoutQuery.slice(dotIndex).toLowerCase();
  return /^[.][a-z0-9]+$/.test(extension) ? extension : "";
}

export function isRasterImagePath(path: string): boolean {
  return RASTER_EXTENSIONS.has(extensionFromPath(path));
}

export function hasNonUprightOrientation(orientation: number | undefined): boolean {
  return orientation != null && orientation !== 1;
}

export function shouldSkipAutoOrientCopy(
  customMetadata: Record<string, unknown> | undefined | null,
): boolean {
  return customMetadata?.[STAGED_ORIENTATION_NORMALIZED_METADATA_KEY] === "true";
}

function outputFormatFromSource(
  sourceFormat: string | undefined,
  forceFormat?: AutoOrientOutputFormat,
): AutoOrientOutputFormat {
  if (forceFormat) {
    return forceFormat;
  }

  if (sourceFormat === "png") {
    return "png";
  }
  if (sourceFormat === "webp") {
    return "webp";
  }
  return "jpeg";
}

function contentTypeForFormat(format: AutoOrientOutputFormat): string {
  if (format === "png") {
    return "image/png";
  }
  if (format === "webp") {
    return "image/webp";
  }
  return "image/jpeg";
}

export async function autoOrientImageBuffer(
  sourceBuffer: Buffer,
  options?: { forceFormat?: AutoOrientOutputFormat },
): Promise<AutoOrientedImage> {
  const metadata = await sharp(sourceBuffer).metadata();
  const format = outputFormatFromSource(metadata.format, options?.forceFormat);
  const pipeline = sharp(sourceBuffer).autoOrient();

  let buffer: Buffer;
  if (format === "png") {
    buffer = await pipeline.png().toBuffer();
  } else if (format === "webp") {
    buffer = await pipeline.webp({ quality: 95 }).toBuffer();
  } else {
    buffer = await pipeline.jpeg({ quality: 95, mozjpeg: true }).toBuffer();
  }

  const outputMetadata = await sharp(buffer).metadata();
  return {
    buffer,
    contentType: contentTypeForFormat(format),
    format,
    sourceOrientation: metadata.orientation,
    width: outputMetadata.width ?? 0,
    height: outputMetadata.height ?? 0,
  };
}
