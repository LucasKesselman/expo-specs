import { getDownloadURL, listAll, ref } from "firebase/storage";

import { arAssetsStorage } from "./firebase";

const DIGITAL_DESIGNS_PREFIX = "DigitalDesigns";
const DESIGN_ASSET_PATTERN = /^designAsset_/i;
const PRIMARY_ASSET_PATTERN = /^designAsset_01\./i;

export async function resolveDesignAssetUrl(digitalDesignId: string): Promise<string> {
  const designId = digitalDesignId.trim();
  if (!designId) {
    throw new Error("Missing digital design ID.");
  }

  const folderRef = ref(arAssetsStorage, `${DIGITAL_DESIGNS_PREFIX}/${designId}`);
  const listing = await listAll(folderRef);

  const designAssets = listing.items.filter((item) => DESIGN_ASSET_PATTERN.test(item.name));
  if (designAssets.length === 0) {
    throw new Error(
      `No design assets found in ar-assets-bucket/${DIGITAL_DESIGNS_PREFIX}/${designId}/.`,
    );
  }

  const primary =
    designAssets.find((item) => PRIMARY_ASSET_PATTERN.test(item.name)) ?? designAssets[0];

  return getDownloadURL(primary);
}
