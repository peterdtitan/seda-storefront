import type { Size } from "./sizes";

/**
 * The shapes the editor forms hand back.
 *
 * Deliberately flat and free of Sanity's wire format — no _type, no references, no
 * slug objects. The forms deal in strings and numbers; src/lib/catalogue/write.ts is
 * the only place that knows what a Sanity document looks like. Keeping the boundary
 * here is what lets the client components import these types without dragging the
 * Postgres driver or the write token into the browser bundle.
 */

export type ImageInput = {
  assetId: string;
  alt: string;
  decorative: boolean;
  /** Carried through untouched. Studio writes these and I must not drop them on save,
   * or every edit silently resets a crop somebody set deliberately. */
  hotspot?: { x: number; y: number; height: number; width: number };
  crop?: { top: number; bottom: number; left: number; right: number };
};

export type StockInput = { size: Size; quantity: number };

export type ColourwayInput = {
  /** The Sanity array _key. Generated once when the row is added and kept for the
   * life of the colourway, because order lines and stock patches address it. */
  key: string;
  name: string;
  slug: string;
  swatch: string;
  images: ImageInput[];
  stock: StockInput[];
};

export type ProductInput = {
  name: string;
  slug: string;
  categoryId: string;
  active: boolean;
  order: number;
  priceKobo: number;
  description: string;
  details: string;
  care: string;
  shipping: string;
  research: string;
  pairsWith: string[];
  colourways: ColourwayInput[];
};

export type LookInput = {
  title: string;
  order: number;
  feature: boolean;
  image: ImageInput | null;
  supportingImages: ImageInput[];
  products: string[];
};

export type CategoryInput = {
  title: string;
  slug: string;
  order: number;
};

export type ValueInput = { key: string; title: string; body: string };
export type ProcessStepInput = {
  key: string;
  title: string;
  body: string;
  image: ImageInput | null;
};

export type AnnouncementInput = {
  enabled: boolean;
  message: string;
  linkLabel: string;
  linkHref: string;
  startsAt: string;
  endsAt: string;
};

export type HomeInput = {
  tagline: string;
  heroEyebrow: string;
  heroHeadline: string;
  heroImage: ImageInput | null;
  manifestoEyebrow: string;
  manifestoHeadline: string;
  manifestoBody: string;
  manifestoImage: ImageInput | null;
  stripImages: ImageInput[];
  designStudyProduct: string;
};

export type ShopInput = {
  shopEyebrow: string;
  shopBannerImage: ImageInput | null;
};

export type StoryInput = {
  meaning: string;
  storyHeroImage: ImageInput | null;
  mission: string;
  vision: string;
  missionImage: ImageInput | null;
  values: ValueInput[];
  processSteps: ProcessStepInput[];
  people: string;
};

export type LookbookInput = {
  lookbookEyebrow: string;
  lookbookIntro: string;
};

export type ContactInput = {
  email: string;
  phone: string;
  social: string;
  studio: string;
  contactImage: ImageInput | null;
  shippingCopy: string;
};

/** Which block of the site-copy singleton a save is touching. Each one patches only
 * its own fields, so two people editing different sections do not fight. */
export type CopySection = "announcement" | "home" | "shop" | "story" | "lookbook" | "contact";

export type CopyInput = {
  announcement: AnnouncementInput;
  home: HomeInput;
  shop: ShopInput;
  story: StoryInput;
  lookbook: LookbookInput;
  contact: ContactInput;
};

/** Field path -> message. "colourways.0.swatch" addresses a nested row so the form can
 * put the message beside the input that caused it. */
export type Errors = Record<string, string>;

export type SaveResult =
  | { ok: true; id: string; message: string }
  | { ok: false; errors: Errors; message: string; conflict?: boolean };

/** What every editor form gets back from its save action. */
export type EditorState =
  | { status: "idle" }
  | { status: "saved"; message: string; id?: string }
  | { status: "error"; message: string; errors: Errors; conflict?: boolean };
