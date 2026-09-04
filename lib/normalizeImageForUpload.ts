import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const RASTER_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);

/** GCS/Firebase custom metadata key set after `normalizeImageForUpload`. Must match functions. */
export const ORIENTATION_NORMALIZED_CUSTOM_METADATA_KEY = "orientationNormalized";

export type NormalizedImage = {
  uri: string;
  name: string;
  mimeType: string;
  width: number;
  height: number;
  orientationNormalized: true;
};

export type NormalizeImageFormat = "jpeg" | "png";

export function extensionFromFileName(name: string): string {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === name.length - 1) {
    return "";
  }

  const extension = name.slice(dotIndex).toLowerCase();
  return /^[.][a-z0-9]+$/.test(extension) ? extension : "";
}

export function isRasterImageUpload(mimeType?: string, name?: string): boolean {
  const mime = mimeType?.toLowerCase() ?? "";
  if (mime.startsWith("image/") && mime !== "image/svg+xml") {
    return true;
  }
  return RASTER_EXTENSIONS.has(extensionFromFileName(name ?? ""));
}

export function portraitVideoStillRotateDegrees(
  videoWidth?: number | null,
  videoHeight?: number | null,
  stillWidth?: number | null,
  stillHeight?: number | null,
): number | undefined {
  if (
    videoWidth == null ||
    videoHeight == null ||
    stillWidth == null ||
    stillHeight == null ||
    videoWidth <= 0 ||
    videoHeight <= 0 ||
    stillWidth <= 0 ||
    stillHeight <= 0
  ) {
    return undefined;
  }

  const videoPortrait = videoHeight > videoWidth;
  const stillPortrait = stillHeight > stillWidth;
  if (videoPortrait === stillPortrait) {
    return undefined;
  }

  return 90;
}

function rewriteExtension(name: string, extension: ".jpg" | ".png"): string {
  const current = extensionFromFileName(name);
  if (current) {
    return `${name.slice(0, -current.length)}${extension}`;
  }
  return `${name}${extension}`;
}

function resolveOutputFormat(
  mimeType: string | undefined,
  name: string,
  forceFormat?: NormalizeImageFormat,
): NormalizeImageFormat {
  if (forceFormat) {
    return forceFormat;
  }

  const mime = mimeType?.toLowerCase() ?? "";
  const extension = extensionFromFileName(name);
  if (mime === "image/png" || extension === ".png") {
    return "png";
  }
  return "jpeg";
}

/**
 * Re-encodes an image through the platform decoder so EXIF/HEIC orientation is
 * baked into pixels and the Orientation tag is 1 / absent.
 */
export async function normalizeImageForUpload(input: {
  uri: string;
  name: string;
  mimeType?: string;
  format?: NormalizeImageFormat;
  rotateDegrees?: number;
}): Promise<NormalizedImage> {
  const format = resolveOutputFormat(input.mimeType, input.name, input.format);
  const saveFormat = format === "png" ? SaveFormat.PNG : SaveFormat.JPEG;
  const extension = format === "png" ? ".png" : ".jpg";

  let context = ImageManipulator.manipulate(input.uri);
  if (input.rotateDegrees) {
    context = context.rotate(input.rotateDegrees);
  }

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    format: saveFormat,
    compress: 1,
  });

  return {
    uri: saved.uri,
    name: rewriteExtension(input.name, extension),
    mimeType: format === "png" ? "image/png" : "image/jpeg",
    width: saved.width,
    height: saved.height,
    orientationNormalized: true,
  };
}

export function orientationNormalizedUploadMetadata(
  orientationNormalized?: boolean,
): { customMetadata: Record<string, string> } | undefined {
  if (!orientationNormalized) {
    return undefined;
  }

  return {
    customMetadata: {
      [ORIENTATION_NORMALIZED_CUSTOM_METADATA_KEY]: "true",
    },
  };
}
