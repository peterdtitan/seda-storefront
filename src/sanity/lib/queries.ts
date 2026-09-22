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
