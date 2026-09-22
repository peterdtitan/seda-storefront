export type SanityImage = {
  alt?: string;
  decorative?: boolean;
  hotspot?: { x: number; y: number };
  crop?: { top: number; bottom: number; left: number; right: number };
  asset?: {
    _id?: string;
    _ref?: string;
    metadata?: {
      lqip?: string;
      dimensions?: { width: number; height: number; aspectRatio: number };
    };
  };
};

export type SiteCopy = {
  tagline: string;
  heroEyebrow: string;
  heroHeadline: string;
  heroImage: SanityImage;
  manifestoEyebrow: string;
  manifestoHeadline: string;
  manifestoBody: string;
  manifestoImage: SanityImage;
  stripImages: SanityImage[];
  meaning: string;
  mission: string;
  vision: string;
  people: string;
  lookbookEyebrow: string;
  lookbookIntro: string;
  email: string;
  phone: string;
  social: string;
  studio: string;
  shippingCopy: string;
};

export type DesignStudy = { name: string; slug: string; description: string };
