import { groq } from "next-sanity";

// I dereference the asset for real dimensions and the lqip blur, so next/image
// reserves the box instead of shifting when the photo lands.
export const IMAGE_FRAGMENT = groq`{
  alt,
  decorative,
  hotspot,
  crop,
  asset->{ _id, metadata { lqip, dimensions } }
}`;

export const SITE_COPY_QUERY = groq`*[_id == "siteCopy"][0]{
  tagline,
  heroEyebrow,
  heroHeadline,
  heroImage ${IMAGE_FRAGMENT},
  manifestoEyebrow,
  manifestoHeadline,
  manifestoBody,
  manifestoImage ${IMAGE_FRAGMENT},
  stripImages[] ${IMAGE_FRAGMENT},
  meaning,
  mission,
  vision,
  people,
  lookbookEyebrow,
  lookbookIntro,
  email,
  phone,
  social,
  studio,
  shippingCopy
}`;

export const FOOTER_QUERY = groq`*[_id == "siteCopy"][0]{ tagline }`;

export const CATEGORIES_QUERY = groq`*[_type == "category"] | order(order asc){
  _id,
  title,
  "slug": slug.current
}`;

export const CARD_FRAGMENT = groq`{
  _id,
  name,
  "slug": slug.current,
  priceKobo,
  category->{ title, "slug": slug.current },
  colourways[]{
    name,
    "slug": slug.current,
    swatch,
    images[0...1] ${IMAGE_FRAGMENT},
    stock[]{ size, quantity }
  }
}`;

export const HOME_QUERY = groq`{
  "copy": ${SITE_COPY_QUERY},
  "products": *[_type == "product" && active] | order(order asc) ${CARD_FRAGMENT},
  "designStudy": *[_id == "siteCopy"][0].designStudyProduct->{
    name,
    "slug": slug.current,
    description
  }
}`;
