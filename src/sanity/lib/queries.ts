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
  shopEyebrow,
  shopBannerImage ${IMAGE_FRAGMENT},
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

export const SHOP_QUERY = groq`{
  "copy": *[_id == "siteCopy"][0]{ shopEyebrow, shopBannerImage ${IMAGE_FRAGMENT} },
  "categories": ${CATEGORIES_QUERY},
  "products": *[_type == "product" && active] | order(order asc) ${CARD_FRAGMENT}
}`;

export const PRODUCT_QUERY = groq`{
  "product": *[_type == "product" && slug.current == $slug][0]{
    _id,
    name,
    "slug": slug.current,
    priceKobo,
    description,
    details,
    care,
    shipping,
    research,
    category->{ title, "slug": slug.current },
    colourways[]{
      name,
      "slug": slug.current,
      swatch,
      images[] ${IMAGE_FRAGMENT},
      stock[]{ size, quantity }
    },
    "pairsWith": pairsWith[]-> ${CARD_FRAGMENT}
  },
  "fallbackPairs": *[_type == "product" && active && slug.current != $slug]
    | order(order asc)[0...4] ${CARD_FRAGMENT},
  "shippingCopy": *[_id == "siteCopy"][0].shippingCopy
}`;

export const PRODUCT_SLUGS_QUERY = groq`*[_type == "product" && active].slug.current`;

export const BAG_QUERY = groq`*[_type == "product" && slug.current in $slugs]{
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

export const LOOKBOOK_QUERY = groq`{
  "copy": *[_id == "siteCopy"][0]{ lookbookEyebrow, lookbookIntro },
  "looks": *[_type == "look"] | order(order asc){
    _id,
    title,
    order,
    feature,
    image ${IMAGE_FRAGMENT},
    supportingImages[] ${IMAGE_FRAGMENT},
    "products": products[]->{ name, "slug": slug.current }
  }
}`;

export const STORY_QUERY = groq`*[_id == "siteCopy"][0]{
  meaning,
  storyHeroImage ${IMAGE_FRAGMENT},
  mission,
  vision,
  missionImage ${IMAGE_FRAGMENT},
  values[]{ _key, title, body },
  processSteps[]{ _key, title, body, image ${IMAGE_FRAGMENT} },
  people
}`;

export const CONTACT_QUERY = groq`*[_id == "siteCopy"][0]{
  email,
  phone,
  social,
  studio,
  contactImage ${IMAGE_FRAGMENT}
}`;
