import { newKey } from "./keys";
import { SIZES } from "./sizes";
import type { ColourwayInput, LookInput, ProductInput } from "./types";

/**
 * Starting points for the create forms.
 *
 * In a plain module rather than beside the forms, because the "new" pages are server
 * components and everything a "use client" file exports becomes a client reference —
 * calling one on the server throws rather than running.
 */

export function blankProduct(categoryId: string): ProductInput {
  return {
    name: "",
    slug: "",
    categoryId,
    active: false,
    order: 0,
    // Not 0. An empty price box should read as unanswered, and zero is an answer that
    // happens to mean the garment is free.
    priceKobo: NaN,
    description: "",
    details: "",
    care: "",
    shipping: "",
    research: "",
    pairsWith: [],
    colourways: [blankColourway()],
  };
}

export function blankColourway(): ColourwayInput {
  return {
    key: newKey(),
    name: "",
    slug: "",
    swatch: "#2f4f4f",
    images: [],
    // Every size present from the start. The schema requires a row each, and asking
    // the owner to add four rows before they can save is a rule pretending to be work.
    stock: SIZES.map((size) => ({ size, quantity: 0 })),
  };
}

export function blankLook(nextOrder: number): LookInput {
  return {
    title: "",
    order: nextOrder,
    feature: false,
    image: null,
    supportingImages: [],
    products: [],
  };
}
