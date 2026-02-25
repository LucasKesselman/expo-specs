/**
 * Seed data for the Designs marketplace. In production, replace with
 * a fetch from your backend or Firestore collection.
 */
import type { Design } from "@/types/design";
import type { DesignProduct } from "@/types/product";

/** Example designs for the Designs tab. */
export const DESIGNS: Design[] = [
  {
    id: "des_abstract_01",
    name: "Abstract Waves",
    author: "Studio One",
    created: "2024-01-15T10:00:00Z",
    categories: ["tees", "new"],
    image: "https://picsum.photos/seed/design1/400/400",
    description: "Fluid abstract pattern in muted blues and greys. Screen-print ready.",
    price: "$14.99",
    priceAmount: 14.99,
    sku: "DES-ABS-001",
    tags: ["abstract", "minimal"],
  },
  {
    id: "des_retro_02",
    name: "Retro Sunset",
    author: "Vintage Prints",
    created: "2024-02-01T14:30:00Z",
    categories: ["tees", "limited-edition"],
    image: "https://picsum.photos/seed/design2/400/400",
    description: "80s-inspired gradient sunset. Limited run.",
    price: "$18.99",
    priceAmount: 18.99,
    sku: "DES-RET-002",
    tags: ["retro", "gradient"],
  },
  {
    id: "des_geo_03",
    name: "Geometric Grid",
    author: "Grid Co",
    created: "2024-02-10T09:00:00Z",
    categories: ["tees", "bestseller"],
    image: "https://picsum.photos/seed/design3/400/400",
    description: "Clean geometric grid layout. Works on light or dark garments.",
    price: "$12.99",
    priceAmount: 12.99,
    sku: "DES-GEO-003",
    tags: ["geometric", "minimal"],
  },
  {
    id: "des_type_04",
    name: "Type Lock",
    author: "Type Studio",
    created: "2024-03-01T11:00:00Z",
    categories: ["tees", "new"],
    image: "https://picsum.photos/seed/design4/400/400",
    description: "Bold typography lock-up. Customizable copy available.",
    price: "$16.99",
    priceAmount: 16.99,
    sku: "DES-TYP-004",
    tags: ["typography", "bold"],
  },
  {
    id: "des_botanical_05",
    name: "Botanical Line",
    author: "Leaf & Stem",
    created: "2024-03-15T16:00:00Z",
    categories: ["tees", "limited-edition", "bestseller"],
    image: "https://picsum.photos/seed/design5/400/400",
    description: "Hand-drawn botanical line art. Organic cotton recommended.",
    price: "$19.99",
    priceAmount: 19.99,
    sku: "DES-BOT-005",
    tags: ["botanical", "line-art"],
  },
  {
    id: "des_patch_06",
    name: "Patch Style",
    author: "Patch Works",
    created: "2024-04-01T08:00:00Z",
    categories: ["tees", "new"],
    image: "https://picsum.photos/seed/design6/400/400",
    description: "Vintage patch-style graphic. One color print.",
    price: "$11.99",
    priceAmount: 11.99,
    sku: "DES-PAT-006",
    tags: ["patch", "vintage"],
  },
  {
    id: "des_splash_07",
    name: "Ink Splash",
    author: "Ink Studio",
    created: "2024-04-12T12:00:00Z",
    categories: ["tees", "limited-edition"],
    image: "https://picsum.photos/seed/design7/400/400",
    description: "Dynamic ink splash effect. High contrast.",
    price: "$17.99",
    priceAmount: 17.99,
    sku: "DES-SPL-007",
    tags: ["ink", "dynamic"],
  },
  {
    id: "des_minimal_08",
    name: "Single Line",
    author: "Minimal Co",
    created: "2024-05-01T10:00:00Z",
    categories: ["tees", "bestseller", "new"],
    image: "https://picsum.photos/seed/design8/400/400",
    description: "One continuous line drawing. Minimal and striking.",
    price: "$13.99",
    priceAmount: 13.99,
    sku: "DES-LIN-008",
    tags: ["minimal", "line"],
  },
];

/**
 * Converts a Design to DesignProduct for saving to Firestore / useSaveDesign.
 */
export function designToDesignProduct(d: Design): DesignProduct {
  return {
    productId: d.id,
    name: d.name,
    description: d.description,
    price: d.price,
    priceAmount: d.priceAmount,
    image: d.image,
    categories: d.categories,
    sku: d.sku,
  };
}
