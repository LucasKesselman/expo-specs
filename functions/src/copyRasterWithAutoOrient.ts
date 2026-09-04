import type { File } from "@google-cloud/storage";
import { logger } from "firebase-functions/logger";

import {
  autoOrientImageBuffer,
  isRasterImagePath,
  shouldSkipAutoOrientCopy,
  type AutoOrientOutputFormat,
} from "./autoOrientImage";

export async function copyFileAutoOrientingRaster(
  source: File,
  destination: File,
  options?: { forceFormat?: AutoOrientOutputFormat },
): Promise<void> {
  if (!isRasterImagePath(source.name) && !isRasterImagePath(destination.name)) {
    await source.copy(destination);
    return;
  }

  const [sourceMetadata] = await source.getMetadata();
  if (shouldSkipAutoOrientCopy(sourceMetadata.metadata)) {
    logger.info("Skipping Sharp auto-orient copy; client already normalized orientation", {
      sourcePath: source.name,
      destinationPath: destination.name,
    });
    await source.copy(destination);
    return;
  }

  const [sourceBuffer] = await source.download();
  const oriented = await autoOrientImageBuffer(sourceBuffer, options);
  const cacheControl =
    typeof sourceMetadata.cacheControl === "string" ? sourceMetadata.cacheControl : undefined;

  await destination.save(oriented.buffer, {
    contentType: oriented.contentType,
    resumable: false,
    metadata: cacheControl
      ? {
          cacheControl,
        }
      : undefined,
  });
}
