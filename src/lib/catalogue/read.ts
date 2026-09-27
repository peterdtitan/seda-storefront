import "server-only";

import { groq } from "next-sanity";

import { canWriteToSanity, writeClient } from "@/sanity/lib/writeClient";

import { SITE_COPY_ID } from "./ids";
import type { CategoryInput, CopyInput, ImageInput, LookInput, ProductInput } from "./types";

/**
 * Reads for the editor.
 *
 * These go through writeClient rather than the storefront's client, and the difference
 * matters: the storefront reads with useCdn:true, which is right for shoppers and
 * wrong here. Somebody who has just saved a price and is looking at the form needs the
 * value they wrote, not a cached one from thirty seconds ago.
 *
 * Every read also carries _rev. The save that follows quotes it back, so a write
 * built on a stale form is refused rather than silently overwriting whatever changed
 * in between — including a stock decrement from an order that landed mid-edit.
 */

function db() {
  if (!canWriteToSanity || !writeClient) {
    throw new Error(
      "SANITY_API_WRITE_TOKEN is not set — the catalogue editor cannot read or write.",
    );
  }
  return writeClient;
}

export const catalogueIsWritable = () => canWriteToSanity;

const IMAGE = groq`{ "assetId": asset._ref, alt, decorative, hotspot, crop }`;

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  order: number;
  priceKobo: number;
  category: string | null;
  assetId: string | null;
  colours: number;
  units: number;
};

const PRODUCT_ROWS = groq`*[_type == "product"] | order(order asc, name asc){
  "id": _id,
  name,
  "slug": slug.current,
  "active": active == true,
  "order": coalesce(order, 0),
  "priceKobo": coalesce(priceKobo, 0),
  "category": category->title,
  "assetId": colourways[0].images[0].asset._ref,
  "colours": count(colourways),
  "units": math::sum(colourways[].stock[].quantity)
}`;

export async function listProducts(): Promise<ProductRow[]> {
  const rows = await db().fetch<ProductRow[]>(PRODUCT_ROWS);
  return (rows ?? []).map((row) => ({ ...row, units: row.units ?? 0, colours: row.colours ?? 0 }));
}

export type Loaded<T> = { id: string; rev: string; input: T };

const PRODUCT_DOC = groq`*[_type == "product" && _id == $id][0]{
  _id, _rev,
  name,
  "slug": slug.current,
  "categoryId": category._ref,
  "active": active == true,
  "order": coalesce(order, 0),
  "priceKobo": coalesce(priceKobo, 0),
  description, details, care, shipping, research,
  "pairsWith": pairsWith[]._ref,
  colourways[]{
    "key": _key,
    name,
    "slug": slug.current,
    swatch,
    images[] ${IMAGE},
    stock[]{ size, quantity }
  }
}`;

type RawProduct = Omit<ProductInput, "shipping" | "research"> & {
  _id: string;
  _rev: string;
  shipping: string | null;
  research: string | null;
  pairsWith: string[] | null;
};

export async function loadProduct(id: string): Promise<Loaded<ProductInput> | null> {
  const doc = await db().fetch<RawProduct | null>(PRODUCT_DOC, { id });
  if (!doc) return null;

  return {
    id: doc._id,
    rev: doc._rev,
    input: {
      name: doc.name ?? "",
      slug: doc.slug ?? "",
      categoryId: doc.categoryId ?? "",
      active: doc.active,
      order: doc.order,
      priceKobo: doc.priceKobo,
      description: doc.description ?? "",
      details: doc.details ?? "",
      care: doc.care ?? "",
      shipping: doc.shipping ?? "",
      research: doc.research ?? "",
      pairsWith: doc.pairsWith ?? [],
      colourways: (doc.colourways ?? []).map((colour) => ({
        ...colour,
        name: colour.name ?? "",
        slug: colour.slug ?? "",
        swatch: colour.swatch ?? "#000000",
        images: cleanImages(colour.images),
        stock: colour.stock ?? [],
      })),
    },
  };
}

/** A colourway whose photograph was deleted in Studio comes back with a null asset,
 * and a null in that array crashes the form rather than showing an empty slot. */
function cleanImages(list: (ImageInput | null)[] | null | undefined): ImageInput[] {
  return (list ?? []).filter((entry): entry is ImageInput => Boolean(entry?.assetId));
}

export type LookRow = {
  id: string;
  title: string | null;
  order: number;
  feature: boolean;
  assetId: string | null;
  products: number;
};

export async function listLooks(): Promise<LookRow[]> {
  const rows = await db().fetch<LookRow[]>(groq`*[_type == "look"] | order(order asc){
    "id": _id,
    title,
    "order": coalesce(order, 0),
    "feature": feature == true,
    "assetId": image.asset._ref,
    "products": count(products)
  }`);
  return (rows ?? []).map((row) => ({ ...row, products: row.products ?? 0 }));
}

export async function loadLook(id: string): Promise<Loaded<LookInput> | null> {
  const doc = await db().fetch<
    (LookInput & { _id: string; _rev: string; title: string | null }) | null
  >(
    groq`*[_type == "look" && _id == $id][0]{
      _id, _rev, title,
      "order": coalesce(order, 1),
      "feature": feature == true,
      image ${IMAGE},
      supportingImages[] ${IMAGE},
      "products": products[]._ref
    }`,
    { id },
  );
  if (!doc) return null;

  return {
    id: doc._id,
    rev: doc._rev,
    input: {
      title: doc.title ?? "",
      order: doc.order,
      feature: doc.feature,
      image: doc.image?.assetId ? doc.image : null,
      supportingImages: cleanImages(doc.supportingImages),
      products: doc.products ?? [],
    },
  };
}

export type CategoryRow = CategoryInput & { id: string; rev: string; products: number };

export async function listCategories(): Promise<CategoryRow[]> {
  const rows = await db().fetch<CategoryRow[]>(groq`*[_type == "category"] | order(order asc){
    "id": _id,
    "rev": _rev,
    title,
    "slug": slug.current,
    "order": coalesce(order, 0),
    "products": count(*[_type == "product" && references(^._id)])
  }`);
  return rows ?? [];
}

export type ProductOption = { id: string; name: string; active: boolean };

/** For the "pairs with" picker and the home page's design study. */
export async function listProductOptions(): Promise<ProductOption[]> {
  const rows = await db().fetch<ProductOption[]>(
    groq`*[_type == "product"] | order(name asc){ "id": _id, name, "active": active == true }`,
  );
  return rows ?? [];
}

const COPY_DOC = groq`*[_id == $id][0]{
  _rev,
  "announcement": {
    "enabled": announcement.enabled == true,
    "message": coalesce(announcement.message, ""),
    "linkLabel": coalesce(announcement.linkLabel, ""),
    "linkHref": coalesce(announcement.linkHref, ""),
    "startsAt": coalesce(announcement.startsAt, ""),
    "endsAt": coalesce(announcement.endsAt, "")
  },
  "home": {
    "tagline": coalesce(tagline, ""),
    "heroEyebrow": coalesce(heroEyebrow, ""),
    "heroHeadline": coalesce(heroHeadline, ""),
    "heroImage": heroImage ${IMAGE},
    "manifestoEyebrow": coalesce(manifestoEyebrow, ""),
    "manifestoHeadline": coalesce(manifestoHeadline, ""),
    "manifestoBody": coalesce(manifestoBody, ""),
    "manifestoImage": manifestoImage ${IMAGE},
    "stripImages": stripImages[] ${IMAGE},
    "designStudyProduct": coalesce(designStudyProduct._ref, "")
  },
  "shop": {
    "shopEyebrow": coalesce(shopEyebrow, ""),
    "shopBannerImage": shopBannerImage ${IMAGE}
  },
  "story": {
    "meaning": coalesce(meaning, ""),
    "storyHeroImage": storyHeroImage ${IMAGE},
    "mission": coalesce(mission, ""),
    "vision": coalesce(vision, ""),
    "missionImage": missionImage ${IMAGE},
    "values": values[]{ "key": _key, title, body },
    "processSteps": processSteps[]{ "key": _key, title, body, image ${IMAGE} },
    "people": coalesce(people, "")
  },
  "lookbook": {
    "lookbookEyebrow": coalesce(lookbookEyebrow, ""),
    "lookbookIntro": coalesce(lookbookIntro, "")
  },
  "contact": {
    "email": coalesce(email, ""),
    "phone": coalesce(phone, ""),
    "social": coalesce(social, ""),
    "studio": coalesce(studio, ""),
    "contactImage": contactImage ${IMAGE},
    "shippingCopy": coalesce(shippingCopy, "")
  }
}`;

export async function loadCopy(): Promise<Loaded<CopyInput>> {
  const doc = await db().fetch<(CopyInput & { _rev: string }) | null>(COPY_DOC, {
    id: SITE_COPY_ID,
  });

  // The singleton may genuinely not exist yet on a fresh dataset. An empty form that
  // creates it on first save beats an error page telling the owner to open Studio.
  if (!doc) return { id: SITE_COPY_ID, rev: "", input: emptyCopy() };

  return {
    id: SITE_COPY_ID,
    rev: doc._rev,
    input: {
      announcement: doc.announcement,
      home: {
        ...doc.home,
        heroImage: doc.home.heroImage?.assetId ? doc.home.heroImage : null,
        manifestoImage: doc.home.manifestoImage?.assetId ? doc.home.manifestoImage : null,
        stripImages: cleanImages(doc.home.stripImages),
      },
      shop: {
        ...doc.shop,
        shopBannerImage: doc.shop.shopBannerImage?.assetId ? doc.shop.shopBannerImage : null,
      },
      story: {
        ...doc.story,
        storyHeroImage: doc.story.storyHeroImage?.assetId ? doc.story.storyHeroImage : null,
        missionImage: doc.story.missionImage?.assetId ? doc.story.missionImage : null,
        values: doc.story.values ?? [],
        processSteps: (doc.story.processSteps ?? []).map((step) => ({
          ...step,
          image: step.image?.assetId ? step.image : null,
        })),
      },
      lookbook: doc.lookbook,
      contact: {
        ...doc.contact,
        contactImage: doc.contact.contactImage?.assetId ? doc.contact.contactImage : null,
      },
    },
  };
}

function emptyCopy(): CopyInput {
  return {
    announcement: {
      enabled: false,
      message: "",
      linkLabel: "",
      linkHref: "",
      startsAt: "",
      endsAt: "",
    },
    home: {
      tagline: "",
      heroEyebrow: "",
      heroHeadline: "",
      heroImage: null,
      manifestoEyebrow: "",
      manifestoHeadline: "",
      manifestoBody: "",
      manifestoImage: null,
      stripImages: [],
      designStudyProduct: "",
    },
    shop: { shopEyebrow: "", shopBannerImage: null },
    story: {
      meaning: "",
      storyHeroImage: null,
      mission: "",
      vision: "",
      missionImage: null,
      values: [],
      processSteps: [],
      people: "",
    },
    lookbook: { lookbookEyebrow: "", lookbookIntro: "" },
    contact: {
      email: "",
      phone: "",
      social: "",
      studio: "",
      contactImage: null,
      shippingCopy: "",
    },
  };
}
