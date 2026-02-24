import type { DesignProduct } from "@/types/product";

/**
 * All design products with productId, basic info, and multiple categories.
 * Use productId as the stable reference when saving to Firestore.
 */
export const PRODUCTS: DesignProduct[] = [
  {
    productId: "prod_classic_crew",
    name: "Classic Crew",
    description: "Essential crewneck tee, soft cotton.",
    price: "$24.99",
    priceAmount: 24.99,
    image: "https://picsum.photos/seed/tee1/400/400",
    categories: ["tees", "bestseller"],
    sku: "TEE-CREW-001",
  },
  {
    productId: "prod_vintage_logo",
    name: "Vintage Logo",
    description: "Retro logo print on heavyweight cotton.",
    price: "$29.99",
    priceAmount: 29.99,
    image: "https://picsum.photos/seed/tee2/400/400",
    categories: ["tees", "limited-edition"],
    sku: "TEE-VINT-002",
  },
  {
    productId: "prod_minimal_stripe",
    name: "Minimal Stripe",
    description: "Clean striped design, relaxed fit.",
    price: "$26.99",
    priceAmount: 26.99,
    image: "https://picsum.photos/seed/tee3/400/400",
    categories: ["tees", "new"],
    sku: "TEE-STRP-003",
  },
  {
    productId: "prod_oversized_fit",
    name: "Oversized Fit",
    description: "Oversized unisex tee for a relaxed look.",
    price: "$32.99",
    priceAmount: 32.99,
    image: "https://picsum.photos/seed/tee4/400/400",
    categories: ["tees", "bestseller", "new"],
    sku: "TEE-OVER-004",
  },
  {
    productId: "prod_graphic_print",
    name: "Graphic Print",
    description: "Bold graphic print, 100% cotton.",
    price: "$27.99",
    priceAmount: 27.99,
    image: "https://picsum.photos/seed/tee5/400/400",
    categories: ["tees", "limited-edition"],
    sku: "TEE-GRPH-005",
  },
  {
    productId: "prod_earth_tone",
    name: "Earth Tone",
    description: "Natural earth tone palette, organic cotton.",
    price: "$25.99",
    priceAmount: 25.99,
    image: "https://picsum.photos/seed/tee6/400/400",
    categories: ["tees", "new", "bestseller"],
    sku: "TEE-EARTH-006",
  },
];
