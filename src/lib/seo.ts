import { urlForImage } from "@/sanity/lib/image";
import type { SanityImage } from "@/sanity/lib/types";

/** Open Graph wants one absolute URL at a fixed size, not a srcset. 1200x630 is the
 * size every crawler crops to, so ask Sanity for exactly that rather than shipping a
 * 4000px original for a preview card. */
export function ogImage(image: SanityImage | null | undefined, alt: string) {
  const url = image?.asset ? urlForImage(image)?.width(1200).height(630).fit("crop").url() : null;
  if (!url) return undefined;
  return [{ url, width: 1200, height: 630, alt }];
}

type ProductLd = {
  name: string;
  slug: string;
  description?: string;
  priceKobo: number;
  imageUrls: string[];
  inStock: boolean;
  category?: string;
};

/** Schema.org Product. Price is published in naira because Offer.price is a decimal
 * in the stated currency — kobo is this codebase's internal unit, not a public one. */
export function productJsonLd(p: ProductLd, origin: (path: string) => string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    ...(p.description ? { description: p.description } : {}),
    ...(p.imageUrls.length ? { image: p.imageUrls } : {}),
    ...(p.category ? { category: p.category } : {}),
    brand: { "@type": "Brand", name: "Șèdá" },
    url: origin(`/product/${p.slug}`),
    offers: {
      "@type": "Offer",
      priceCurrency: "NGN",
      price: (p.priceKobo / 100).toFixed(2),
      availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: origin(`/product/${p.slug}`),
    },
  };
}

export function organisationJsonLd(origin: (path: string) => string, logoUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Șèdá",
    url: origin("/"),
    logo: logoUrl,
    description: "Contemporary Adire for everyday life. Hand-dyed in Lagos, made in short runs.",
    address: { "@type": "PostalAddress", addressCountry: "NG", addressLocality: "Lagos" },
  };
}
