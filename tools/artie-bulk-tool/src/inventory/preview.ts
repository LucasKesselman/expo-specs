import type { Firestore } from "firebase-admin/firestore";
import type { ParsedInventoryInput } from "./input.js";

const PHYSICAL_DESIGNS_COLLECTION = "PhysicalDesigns";
const DEFAULT_COLOR = "UNSPECIFIED";

export interface InventoryPreview {
  physicalDesignId: string;
  designNumber: string;
  version: string;
  color: string;
  quantity: number;
  size: ParsedInventoryInput["size"];
  backprintVersion: string;
}

export async function previewPhysicalDesign(
  db: Firestore,
  input: ParsedInventoryInput,
): Promise<InventoryPreview> {
  const physicalDesignSnap = await db.collection(PHYSICAL_DESIGNS_COLLECTION).doc(input.physicalDesignId).get();
  if (!physicalDesignSnap.exists) {
    throw new Error(`PhysicalDesign not found: ${input.physicalDesignId}`);
  }

  const physicalDesignData = physicalDesignSnap.data() ?? {};
  const designNumber =
    typeof physicalDesignData.designNumber === "string" && physicalDesignData.designNumber.trim()
      ? physicalDesignData.designNumber.trim()
      : "";
  if (!designNumber) {
    throw new Error(`PhysicalDesign is missing designNumber: ${input.physicalDesignId}`);
  }

  const color =
    typeof physicalDesignData.color === "string" && physicalDesignData.color.trim()
      ? physicalDesignData.color.trim()
      : DEFAULT_COLOR;

  return {
    physicalDesignId: input.physicalDesignId,
    designNumber,
    version: `${designNumber}${input.backprintVersion}`,
    color,
    quantity: input.quantity,
    size: input.size,
    backprintVersion: input.backprintVersion,
  };
}
