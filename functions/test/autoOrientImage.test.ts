import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";

import {
  autoOrientImageBuffer,
  hasNonUprightOrientation,
  isRasterImagePath,
  shouldSkipAutoOrientCopy,
  STAGED_ORIENTATION_NORMALIZED_METADATA_KEY,
} from "../src/autoOrientImage";

async function jpegWithOrientation(orientation: 1 | 3 | 6): Promise<Buffer> {
  const left = await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: 20,
      height: 10,
      channels: 3,
      background: { r: 0, g: 0, b: 255 },
    },
  })
    .composite([{ input: left, left: 0, top: 0 }])
    .withMetadata({ orientation })
    .jpeg()
    .toBuffer();
}

test("orientation 6 (90 CW) is baked into upright pixels and the tag is removed", async () => {
  const source = await jpegWithOrientation(6);
  const sourceMeta = await sharp(source).metadata();

  assert.equal(sourceMeta.orientation, 6);
  assert.equal(sourceMeta.width, 20);
  assert.equal(sourceMeta.height, 10);
  assert.equal(hasNonUprightOrientation(sourceMeta.orientation), true);

  const oriented = await autoOrientImageBuffer(source);
  const orientedMeta = await sharp(oriented.buffer).metadata();

  assert.equal(oriented.sourceOrientation, 6);
  assert.equal(oriented.width, 10);
  assert.equal(oriented.height, 20);
  assert.ok(orientedMeta.orientation == null || orientedMeta.orientation === 1);

  const { data, info } = await sharp(oriented.buffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 10);
  assert.equal(info.height, 20);

  const topLeft = { r: data[0], g: data[1], b: data[2] };
  assert.ok(topLeft.r > 200 && topLeft.g < 30 && topLeft.b < 30, "top-left should be red after 90° bake");
});

test("orientation 3 (180) is baked into upright pixels and the tag is removed", async () => {
  const source = await jpegWithOrientation(3);
  const sourceMeta = await sharp(source).metadata();

  assert.equal(sourceMeta.orientation, 3);
  assert.equal(sourceMeta.width, 20);
  assert.equal(sourceMeta.height, 10);

  const oriented = await autoOrientImageBuffer(source);
  const orientedMeta = await sharp(oriented.buffer).metadata();

  assert.equal(oriented.sourceOrientation, 3);
  assert.equal(oriented.width, 20);
  assert.equal(oriented.height, 10);
  assert.ok(orientedMeta.orientation == null || orientedMeta.orientation === 1);

  const { data, info } = await sharp(oriented.buffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 20);
  assert.equal(info.height, 10);

  const bottomRightOffset = ((info.height - 1) * info.width + (info.width - 1)) * info.channels;
  const bottomRight = {
    r: data[bottomRightOffset],
    g: data[bottomRightOffset + 1],
    b: data[bottomRightOffset + 2],
  };
  assert.ok(
    bottomRight.r > 200 && bottomRight.g < 30 && bottomRight.b < 30,
    "bottom-right should be red after 180° bake",
  );
});

test("orientation 1 images keep pixel layout", async () => {
  const source = await jpegWithOrientation(1);
  const oriented = await autoOrientImageBuffer(source);
  const orientedMeta = await sharp(oriented.buffer).metadata();

  assert.ok(oriented.sourceOrientation == null || oriented.sourceOrientation === 1);
  assert.equal(oriented.width, 20);
  assert.equal(oriented.height, 10);
  assert.ok(orientedMeta.orientation == null || orientedMeta.orientation === 1);
});

test("isRasterImagePath detects image extensions used for AR and marketplace assets", () => {
  assert.equal(isRasterImagePath("_temp/uid/designAsset.jpg"), true);
  assert.equal(isRasterImagePath("DigitalDesigns/id/designAsset_01.png"), true);
  assert.equal(isRasterImagePath("_temp/uid/frontTargetImage.png"), true);
  assert.equal(isRasterImagePath("DigitalDesigns/id/designAsset_01.mp4"), false);
  assert.equal(isRasterImagePath("DigitalDesigns/id/designAsset_01.gltf"), false);
});

test("shouldSkipAutoOrientCopy only when the client staging flag is true", () => {
  assert.equal(shouldSkipAutoOrientCopy({ orientationNormalized: "true" }), true);
  assert.equal(shouldSkipAutoOrientCopy({ orientationNormalized: "false" }), false);
  assert.equal(shouldSkipAutoOrientCopy({ orientationNormalized: true }), false);
  assert.equal(shouldSkipAutoOrientCopy({ marketplaceAssetOrientationNormalized: "true" }), false);
  assert.equal(shouldSkipAutoOrientCopy({}), false);
  assert.equal(shouldSkipAutoOrientCopy(undefined), false);
  assert.equal(shouldSkipAutoOrientCopy(null), false);
  assert.equal(STAGED_ORIENTATION_NORMALIZED_METADATA_KEY, "orientationNormalized");
});
