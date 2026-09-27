import { SIZES } from "./sizes";
import type {
  AnnouncementInput,
  CategoryInput,
  ContactInput,
  Errors,
  HomeInput,
  ImageInput,
  LookInput,
  LookbookInput,
  ProductInput,
  ShopInput,
  StoryInput,
} from "./types";

/**
 * Every rule the Sanity schema declares, restated so it actually runs.
 *
 * The `validation: (rule) => rule.required()` calls in src/sanity/schemaTypes are
 * Studio-side only — they gate the Studio's own form and have no effect on a token
 * write through the API. I found this the hard way in src/lib/orders/stock.ts, where
 * min(0) did not stop a negative quantity and the count had to be clamped by hand.
 *
 * So this module is the real schema. If a rule exists in both places they have to be
 * kept in step; if it exists only there, it does not exist.
 *
 * Pure and dependency-free on purpose: the forms run it on every keystroke to show
 * errors inline, and the server actions run it again before writing, because a form
 * that validates in the browser has validated nothing.
 */

const HEX = /^#[0-9a-fA-F]{6}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const required = (value: string) => value.trim().length > 0;

function text(errors: Errors, path: string, value: string, label: string, max = 0) {
  if (!required(value)) errors[path] = `${label} is required.`;
  else if (max && value.trim().length > max) errors[path] = `${label} is over ${max} characters.`;
}

function slug(errors: Errors, path: string, value: string) {
  if (!required(value)) errors[path] = "A slug is required — it is the web address.";
  else if (!SLUG.test(value)) {
    errors[path] = "Lowercase letters, numbers and single hyphens only.";
  } else if (value.length > 96) errors[path] = "Slugs stop at 96 characters.";
}

function wholeNumber(errors: Errors, path: string, value: number, label: string, min = 0) {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    errors[path] = `${label} must be a whole number.`;
  } else if (value < min) errors[path] = `${label} cannot be below ${min}.`;
}

/** Alt text is required unless the image is flagged decorative. The storefront cannot
 * ship images nobody can describe, and a rule is the only reason it gets written. */
function image(errors: Errors, path: string, value: ImageInput | null, label: string) {
  if (!value || !value.assetId) {
    errors[path] = `${label} needs a photograph.`;
    return;
  }
  if (!value.decorative && !required(value.alt)) {
    errors[`${path}.alt`] = "Describe the photograph, or tick decorative.";
  }
}

function images(
  errors: Errors,
  path: string,
  list: ImageInput[],
  label: string,
  min: number,
  max = 0,
) {
  if (list.length < min) {
    errors[path] = `${label} needs at least ${min} ${min === 1 ? "photograph" : "photographs"}.`;
    return;
  }
  if (max && list.length > max) {
    errors[path] = `${label} takes at most ${max}.`;
    return;
  }
  list.forEach((entry, index) => image(errors, `${path}.${index}`, entry, "This slot"));
}

export function validateProduct(input: ProductInput): Errors {
  const errors: Errors = {};

  text(errors, "name", input.name, "The garment's name");
  slug(errors, "slug", input.slug);
  if (!input.categoryId) errors.categoryId = "Pick a category — the shop filters on it.";
  wholeNumber(errors, "order", input.order, "Sort order");

  // Kobo, not naira. The form divides by 100 for display and multiplies back, so a
  // fractional value here means the arithmetic went wrong rather than the typing.
  wholeNumber(errors, "priceKobo", input.priceKobo, "The price");
  if (!errors.priceKobo && input.priceKobo === 0) {
    errors.priceKobo = "A price of zero would let the piece be checked out for nothing.";
  }

  text(errors, "description", input.description, "The rationale");
  text(errors, "details", input.details, "The details tab");
  text(errors, "care", input.care, "The care tab");

  if (input.pairsWith.length > 4) errors.pairsWith = "Four at most — the row only fits four.";
  if (new Set(input.pairsWith).size !== input.pairsWith.length) {
    errors.pairsWith = "The same piece is listed twice.";
  }

  if (input.colourways.length === 0) {
    errors.colourways = "A garment needs at least one colourway, or it cannot be bought.";
  }

  const colourSlugs = new Set<string>();
  input.colourways.forEach((colour, index) => {
    const at = `colourways.${index}`;

    text(errors, `${at}.name`, colour.name, "The colour name");
    slug(errors, `${at}.slug`, colour.slug);

    if (colour.slug && colourSlugs.has(colour.slug)) {
      errors[`${at}.slug`] =
        "Two colourways share this slug — the product URL cannot tell them apart.";
    }
    colourSlugs.add(colour.slug);

    if (!HEX.test(colour.swatch)) {
      errors[`${at}.swatch`] = "A six-digit hex colour, like #2F4F4F. Sample it from the cloth.";
    }

    images(errors, `${at}.images`, colour.images, "This colourway", 1);

    // The schema requires a row per size rather than letting absence mean nothing,
    // because the product page prints real counts and a missing row reads as zero.
    const sizes = colour.stock.map((row) => row.size);
    const missing = SIZES.filter((size) => !sizes.includes(size));
    if (missing.length) errors[`${at}.stock`] = `No row for ${missing.join(", ")}.`;
    else if (new Set(sizes).size !== sizes.length) {
      errors[`${at}.stock`] = "A size is listed twice.";
    }

    colour.stock.forEach((row, rowIndex) => {
      wholeNumber(errors, `${at}.stock.${rowIndex}.quantity`, row.quantity, "Stock");
    });
  });

  return errors;
}

export function validateLook(input: LookInput): Errors {
  const errors: Errors = {};

  wholeNumber(errors, "order", input.order, "The look number", 1);
  image(errors, "image", input.image, "A look");
  images(errors, "supportingImages", input.supportingImages, "Supporting images", 0, 2);

  if (new Set(input.products).size !== input.products.length) {
    errors.products = "The same piece is listed twice.";
  }

  return errors;
}

export function validateCategory(input: CategoryInput): Errors {
  const errors: Errors = {};
  text(errors, "title", input.title, "The category name");
  slug(errors, "slug", input.slug);
  wholeNumber(errors, "order", input.order, "Filter position");
  return errors;
}

export function validateAnnouncement(input: AnnouncementInput): Errors {
  const errors: Errors = {};

  // Only checked when it is switched on: the whole point of the bar is that last
  // month's message stays in the box, switched off, ready to be edited for the next drop.
  if (!input.enabled) return errors;

  text(errors, "message", input.message, "The message", 90);

  if (required(input.linkLabel) && !required(input.linkHref)) {
    errors.linkHref = "The link has text but nowhere to go.";
  }
  if (required(input.linkHref) && !/^(\/|https:\/\/)/.test(input.linkHref)) {
    errors.linkHref = "A path starting with / or a full https:// address.";
  }
  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) {
    errors.endsAt = "It would be hidden before it appeared.";
  }

  return errors;
}

export function validateHome(input: HomeInput): Errors {
  const errors: Errors = {};

  text(errors, "tagline", input.tagline, "The tagline");
  text(errors, "heroEyebrow", input.heroEyebrow, "The hero eyebrow");
  text(errors, "heroHeadline", input.heroHeadline, "The hero headline");
  image(errors, "heroImage", input.heroImage, "The hero");
  text(errors, "manifestoEyebrow", input.manifestoEyebrow, "The manifesto eyebrow");
  text(errors, "manifestoHeadline", input.manifestoHeadline, "The manifesto headline");
  text(errors, "manifestoBody", input.manifestoBody, "The manifesto body");
  image(errors, "manifestoImage", input.manifestoImage, "The manifesto image");

  // Exactly four: the strip is a four-column full-bleed row and any other number
  // leaves a gap or silently drops a photograph.
  if (input.stripImages.length !== 4) {
    errors.stripImages = `The strip takes exactly four photographs — there ${
      input.stripImages.length === 1 ? "is" : "are"
    } ${input.stripImages.length}.`;
  } else images(errors, "stripImages", input.stripImages, "The strip", 4, 4);

  return errors;
}

export function validateShop(input: ShopInput): Errors {
  const errors: Errors = {};
  text(errors, "shopEyebrow", input.shopEyebrow, "The shop eyebrow");
  image(errors, "shopBannerImage", input.shopBannerImage, "The shop banner");
  return errors;
}

export function validateStory(input: StoryInput): Errors {
  const errors: Errors = {};

  text(errors, "meaning", input.meaning, "The meaning line");
  text(errors, "mission", input.mission, "The mission");
  text(errors, "vision", input.vision, "The vision");
  text(errors, "people", input.people, "The closing line");

  if (input.storyHeroImage) image(errors, "storyHeroImage", input.storyHeroImage, "The story hero");
  if (input.missionImage) image(errors, "missionImage", input.missionImage, "The mission image");

  if (input.values.length !== 3) errors.values = "Three core values, no more and no fewer.";
  input.values.forEach((value, index) => {
    text(errors, `values.${index}.title`, value.title, "The value's name");
    text(errors, `values.${index}.body`, value.body, "The value's text");
  });

  if (input.processSteps.length !== 4) errors.processSteps = "Four process steps.";
  input.processSteps.forEach((step, index) => {
    text(errors, `processSteps.${index}.title`, step.title, "The step's name");
    text(errors, `processSteps.${index}.body`, step.body, "The step's text");
    if (step.image) image(errors, `processSteps.${index}.image`, step.image, "The step image");
  });

  return errors;
}

export function validateLookbook(input: LookbookInput): Errors {
  const errors: Errors = {};
  text(errors, "lookbookEyebrow", input.lookbookEyebrow, "The lookbook eyebrow");
  text(errors, "lookbookIntro", input.lookbookIntro, "The lookbook intro");
  return errors;
}

export function validateContact(input: ContactInput): Errors {
  const errors: Errors = {};

  if (!EMAIL.test(input.email.trim())) errors.email = "That is not an email address.";
  text(errors, "phone", input.phone, "The phone number");
  text(errors, "social", input.social, "The social handle");
  text(errors, "studio", input.studio, "The studio line");
  text(errors, "shippingCopy", input.shippingCopy, "The shipping copy");
  if (input.contactImage) image(errors, "contactImage", input.contactImage, "The contact image");

  return errors;
}

export function hasErrors(errors: Errors): boolean {
  return Object.keys(errors).length > 0;
}

/** One line for the top of the form. The inline messages say what; this says how many,
 * because on a long form the broken field is usually off screen. */
export function summarise(errors: Errors): string {
  const count = Object.keys(errors).length;
  if (count === 0) return "";
  return count === 1
    ? "One field needs attention before this can be saved."
    : `${count} fields need attention before this can be saved.`;
}
