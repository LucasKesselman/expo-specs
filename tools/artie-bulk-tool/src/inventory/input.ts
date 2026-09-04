export const MAX_QUANTITY = 500;
export const GARMENT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export type GarmentSize = (typeof GARMENT_SIZES)[number];

export interface InventoryCliFlags {
  physicalDesignId?: unknown;
  quantity?: unknown;
  size?: unknown;
  quantitySize?: unknown;
  backprintVersion?: unknown;
}

export interface ParsedInventoryInput {
  physicalDesignId: string;
  quantity: number;
  size: GarmentSize;
  backprintVersion: string;
}

export function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string.`);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

export function normalizeSize(value: unknown): GarmentSize {
  const normalizedValue = normalizeRequiredString(value, "size").toUpperCase();
  if (!(GARMENT_SIZES as readonly string[]).includes(normalizedValue)) {
    throw new Error("size must be one of XS, S, M, L, XL or XXL.");
  }

  return normalizedValue as GarmentSize;
}

export function normalizeQuantity(value: unknown): number {
  const coerced = coerceInteger(value);
  if (typeof coerced !== "number" || !Number.isInteger(coerced) || coerced <= 0) {
    throw new Error("quantity must be a positive integer.");
  }

  if (coerced > MAX_QUANTITY) {
    throw new Error(`quantity must be at most ${MAX_QUANTITY}.`);
  }

  return coerced;
}

export function parseQuantitySize(value: unknown): { quantity: number; size: GarmentSize } {
  const raw = normalizeRequiredString(value, "quantitySize");
  const match = raw.match(/^(\d+)\s*,\s*([A-Za-z]+)$/);
  if (!match) {
    throw new Error('quantitySize must look like "50, L".');
  }

  return {
    quantity: normalizeQuantity(Number.parseInt(match[1], 10)),
    size: normalizeSize(match[2]),
  };
}

export function resolveQuantityAndSize(body: {
  quantity?: unknown;
  size?: unknown;
  quantitySize?: unknown;
}): { quantity: number; size: GarmentSize } {
  const hasExplicitQuantity = body.quantity !== undefined;
  const hasExplicitSize = body.size !== undefined;

  if (hasExplicitQuantity || hasExplicitSize) {
    if (!hasExplicitQuantity || !hasExplicitSize) {
      throw new Error("Provide both quantity and size, or quantitySize alone.");
    }

    return {
      quantity: normalizeQuantity(body.quantity),
      size: normalizeSize(body.size),
    };
  }

  if (body.quantitySize !== undefined) {
    return parseQuantitySize(body.quantitySize);
  }

  throw new Error('Provide quantity and size, or quantitySize like "50, L".');
}

export function parseInventoryInput(flags: InventoryCliFlags): ParsedInventoryInput {
  const physicalDesignId = normalizeRequiredString(flags.physicalDesignId, "physicalDesignId");
  const backprintVersion = normalizeRequiredString(flags.backprintVersion, "backprintVersion");
  const { quantity, size } = resolveQuantityAndSize(flags);

  return {
    physicalDesignId,
    quantity,
    size,
    backprintVersion,
  };
}

function coerceInteger(value: unknown): unknown {
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  return value;
}
