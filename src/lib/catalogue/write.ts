import "server-only";

import { groq } from "next-sanity";

import { sql } from "@/lib/db";
import { canWriteToSanity, writeClient } from "@/sanity/lib/writeClient";

import { SITE_COPY_ID } from "./ids";
import { newKey } from "./keys";
import type {
  AnnouncementInput,
  CategoryInput,
  ContactInput,
  HomeInput,
  ImageInput,
  LookInput,
  LookbookInput,
  ProductInput,
  SaveResult,
  ShopInput,
  StoryInput,
} from "./types";

/**
 * Writes to the Content Lake on the owner's behalf.
 *
 * Nobody here has a Sanity account. The token belongs to the application, and the only
 * thing standing between a request and the catalogue is the admin session — which is
 * why every caller in actions.ts goes through requirePermission("catalogue.write")
 * before it reaches any of this.
 *
 * Two rules hold everywhere in this file:
 *
 * Patch, never replace. A createOrReplace on a product would take the whole document
 * with it, including the stock counts the Paystack webhook writes through
 * src/lib/orders/stock.ts. An order paid while somebody had the form open would be
 * quietly un-decremented.
 *
 * Every patch is guarded by ifRevisionId. Unlike the stock patch, which retries on a
 * mismatch because it is a mechanical decrement, a mismatch here is refused outright:
 * the owner is editing the same numbers, so the machine cannot know whose version is
 * right. It says so and asks them to reload.
 */

function db() {
  if (!canWriteToSanity || !writeClient) {
    throw new Error("SANITY_API_WRITE_TOKEN is not set — the catalogue cannot be edited.");
  }
  return writeClient;
}

function isConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    (error as { statusCode?: number }).statusCode === 409
  );
}

const STALE =
  "Somebody — or an incoming order — changed this while you had it open. Reload the page and make the change again; saving now would undo theirs.";

async function commit(run: () => Promise<{ _id: string }>, message: string): Promise<SaveResult> {
  try {
    const doc = await run();
    return { ok: true, id: doc._id, message };
  } catch (error) {
    if (isConflict(error)) return { ok: false, errors: {}, message: STALE, conflict: true };
    console.error("[catalogue] write failed", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, errors: {}, message: `Sanity refused the change: ${detail}` };
  }
}

/* ---------- value builders ---------- */

function imageValue(image: ImageInput, type = "productImage") {
  return {
    _type: type,
    asset: { _type: "reference", _ref: image.assetId },
    alt: image.alt.trim(),
    decorative: image.decorative,
    ...(image.hotspot ? { hotspot: image.hotspot } : {}),
    ...(image.crop ? { crop: image.crop } : {}),
  };
}

function imageArray(list: ImageInput[]) {
  return list.map((image) => ({ ...imageValue(image), _key: newKey() }));
}

function reference(id: string) {
  return { _type: "reference", _ref: id };
}

function referenceArray(ids: string[]) {
  return ids.map((id) => ({ ...reference(id), _key: newKey() }));
}

function productFields(input: ProductInput) {
  return {
    name: input.name.trim(),
    slug: { _type: "slug", current: input.slug },
    category: reference(input.categoryId),
    active: input.active,
    order: input.order,
    priceKobo: input.priceKobo,
    description: input.description.trim(),
    details: input.details.trim(),
    care: input.care.trim(),
    pairsWith: referenceArray(input.pairsWith),
    colourways: input.colourways.map((colour) => ({
      _type: "colourway",
      // Kept from the loaded document rather than regenerated. The key is how Sanity
      // addresses the row, and a new one on every save would orphan any patch built
      // against the old one.
      _key: colour.key,
      name: colour.name.trim(),
      slug: { _type: "slug", current: colour.slug },
      swatch: colour.swatch.toLowerCase(),
      images: imageArray(colour.images),
      stock: colour.stock.map((row) => ({
        _type: "sizeStock",
        _key: `size-${row.size}`,
        size: row.size,
        quantity: row.quantity,
      })),
    })),
  };
}

/** Optional fields are unset rather than written as "". An empty string is a value,
 * and the product page tests for absence to fall back to the site-wide shipping copy. */
function optional(input: Record<string, string>) {
  const set: Record<string, string> = {};
  const unset: string[] = [];
  for (const [field, value] of Object.entries(input)) {
    if (value.trim()) set[field] = value.trim();
    else unset.push(field);
  }
  return { set, unset };
}

/* ---------- slugs ---------- */

/** Studio enforces nothing on an API write, and two products sharing a slug means one
 * of them is unreachable — /product/<slug> picks whichever GROQ returns first. */
export async function slugTaken(
  type: "product" | "category",
  slug: string,
  exceptId: string | null,
): Promise<boolean> {
  const clash = await db().fetch<string | null>(
    groq`*[_type == $type && slug.current == $slug && _id != $exceptId && !(_id in path("drafts.**"))][0]._id`,
    { type, slug, exceptId: exceptId ?? "none" },
  );
  return Boolean(clash);
}

/* ---------- products ---------- */

export async function saveProduct(
  id: string | null,
  rev: string | null,
  input: ProductInput,
): Promise<SaveResult> {
  if (await slugTaken("product", input.slug, id)) {
    return {
      ok: false,
      errors: { slug: "Another product already uses this address." },
      message: "That web address is taken.",
    };
  }

  const fields = productFields(input);
  const extra = optional({ shipping: input.shipping, research: input.research });

  if (!id) {
    return commit(
      () => db().create({ _type: "product", ...fields, ...extra.set }),
      `${input.name} is in the catalogue.`,
    );
  }

  return commit(async () => {
    let patch = db()
      .patch(id)
      .ifRevisionId(rev ?? "")
      .set({ ...fields, ...extra.set });
    if (extra.unset.length) patch = patch.unset(extra.unset);
    return patch.commit({ autoGenerateArrayKeys: false });
  }, "Saved.");
}

export async function setProductActive(id: string, active: boolean): Promise<SaveResult> {
  return commit(
    () => db().patch(id).set({ active }).commit(),
    active ? "Back in the shop." : "Hidden from the shop. Its order history is untouched.",
  );
}

/** Sort order is its own write so the list can be reordered without opening each
 * product and without quoting a revision per row. */
export async function setProductOrder(entries: { id: string; order: number }[]) {
  let tx = db().transaction();
  for (const entry of entries) tx = tx.patch(entry.id, (p) => p.set({ order: entry.order }));
  await tx.commit();
}

export type DeleteCheck = {
  blockedBy: { id: string; label: string }[];
  unitsSold: number;
};

/**
 * What deleting this product would break.
 *
 * Order history is safe either way — order_items stores product_slug and product_name
 * as text rather than a reference, precisely so a past order still reads correctly
 * after the garment leaves the catalogue. What is not safe is another Sanity document
 * pointing at it: a look, a "pairs with" row, or the home page's design study. Sanity
 * refuses the delete in that case, so I find them first and name them.
 */
export async function deleteCheck(id: string, slug: string): Promise<DeleteCheck> {
  const [referring, sold] = await Promise.all([
    db().fetch<{ id: string; label: string }[]>(
      groq`*[references($id)]{
        "id": _id,
        "label": select(
          _type == "product" => "Product: " + name,
          _type == "look" => "Look " + string(order),
          _id == "siteCopy" => "The home page design study",
          _type
        )
      }`,
      { id },
    ),
    countSold(slug),
  ]);

  return { blockedBy: referring ?? [], unitsSold: sold };
}

async function countSold(slug: string): Promise<number> {
  if (!sql) return 0;
  const rows = await sql<{ units: number }[]>`
    select coalesce(sum(quantity), 0)::int as units
    from order_items
    where product_slug = ${slug}
  `;
  return rows[0]?.units ?? 0;
}

export async function deleteProduct(id: string): Promise<SaveResult> {
  return commit(async () => {
    await db().delete(id);
    return { _id: id };
  }, "Deleted.");
}

/* ---------- looks ---------- */

export async function saveLook(
  id: string | null,
  rev: string | null,
  input: LookInput,
): Promise<SaveResult> {
  const fields = {
    order: input.order,
    feature: input.feature,
    image: input.image ? imageValue(input.image) : undefined,
    supportingImages: imageArray(input.supportingImages),
    products: referenceArray(input.products),
  };
  const extra = optional({ title: input.title });

  // Exactly one feature look. The lookbook renders the first it finds large and the
  // rest in the grid, so two ticked is a silent layout bug rather than an error.
  const demoteOthers = async () => {
    if (!input.feature) return;
    const others = await db().fetch<string[]>(
      groq`*[_type == "look" && feature == true && _id != $id]._id`,
      { id: id ?? "none" },
    );
    if (!others?.length) return;
    let tx = db().transaction();
    for (const other of others) tx = tx.patch(other, (p) => p.set({ feature: false }));
    await tx.commit();
  };

  if (!id) {
    return commit(async () => {
      await demoteOthers();
      return db().create({ _type: "look", ...fields, ...extra.set });
    }, "The look is live.");
  }

  return commit(async () => {
    await demoteOthers();
    let patch = db()
      .patch(id)
      .ifRevisionId(rev ?? "")
      .set({ ...fields, ...extra.set });
    if (extra.unset.length) patch = patch.unset(extra.unset);
    return patch.commit({ autoGenerateArrayKeys: false });
  }, "Saved.");
}

export async function deleteLook(id: string): Promise<SaveResult> {
  return commit(async () => {
    await db().delete(id);
    return { _id: id };
  }, "Look deleted.");
}

/* ---------- categories ---------- */

export async function saveCategory(
  id: string | null,
  rev: string | null,
  input: CategoryInput,
): Promise<SaveResult> {
  if (await slugTaken("category", input.slug, id)) {
    return {
      ok: false,
      errors: { slug: "Another category already uses this address." },
      message: "That web address is taken.",
    };
  }

  const fields = {
    title: input.title.trim(),
    slug: { _type: "slug", current: input.slug },
    order: input.order,
  };

  if (!id) {
    return commit(() => db().create({ _type: "category", ...fields }), `${input.title} added.`);
  }
  return commit(
    () =>
      db()
        .patch(id)
        .ifRevisionId(rev ?? "")
        .set(fields)
        .commit(),
    "Saved.",
  );
}

export async function deleteCategory(id: string): Promise<SaveResult> {
  const inUse = await db().fetch<number>(groq`count(*[_type == "product" && references($id)])`, {
    id,
  });
  if (inUse > 0) {
    return {
      ok: false,
      errors: {},
      message: `${inUse} ${inUse === 1 ? "product uses" : "products use"} this category. Move them first — a product with no category disappears from the shop filters.`,
    };
  }

  return commit(async () => {
    await db().delete(id);
    return { _id: id };
  }, "Category deleted.");
}

/* ---------- site copy ---------- */

/**
 * The singleton is patched a section at a time rather than as one document, so the
 * announcement bar can be switched off without carrying the whole of the story page
 * along with it.
 *
 * No ifRevisionId here, and that is deliberate rather than an omission. A Sanity patch
 * is field-level: setting `tagline` leaves every other field alone. The sections touch
 * disjoint fields, so guarding on the revision would reject the perfectly ordinary
 * case of somebody saving the home section and then the contact section — the first
 * save moves the revision the second one is holding. The products editor does guard,
 * because it rewrites the whole colourways array and that array holds stock.
 *
 * createIfNotExists first: a fresh dataset has no siteCopy document, and a patch
 * against a missing id fails rather than creating one.
 */
async function patchCopy(fields: Record<string, unknown>, unset: string[] = []) {
  await db().createIfNotExists({ _id: SITE_COPY_ID, _type: "siteCopy" });

  let patch = db().patch(SITE_COPY_ID).set(fields);
  if (unset.length) patch = patch.unset(unset);

  return patch.commit({ autoGenerateArrayKeys: false });
}

export async function saveAnnouncement(input: AnnouncementInput) {
  const extra = optional({
    "announcement.message": input.message,
    "announcement.linkLabel": input.linkLabel,
    "announcement.linkHref": input.linkHref,
    "announcement.startsAt": input.startsAt,
    "announcement.endsAt": input.endsAt,
  });

  return commit(
    () => patchCopy({ "announcement.enabled": input.enabled, ...extra.set }, extra.unset),
    input.enabled ? "The bar is up." : "The bar is off. The message is kept for next time.",
  );
}

export async function saveHome(input: HomeInput) {
  const fields: Record<string, unknown> = {
    tagline: input.tagline.trim(),
    heroEyebrow: input.heroEyebrow.trim(),
    heroHeadline: input.heroHeadline,
    manifestoEyebrow: input.manifestoEyebrow.trim(),
    manifestoHeadline: input.manifestoHeadline,
    manifestoBody: input.manifestoBody,
    stripImages: imageArray(input.stripImages),
  };
  if (input.heroImage) fields.heroImage = imageValue(input.heroImage);
  if (input.manifestoImage) fields.manifestoImage = imageValue(input.manifestoImage);

  const unset: string[] = [];
  if (input.designStudyProduct) fields.designStudyProduct = reference(input.designStudyProduct);
  else unset.push("designStudyProduct");

  return commit(() => patchCopy(fields, unset), "The home page is updated.");
}

export async function saveShop(input: ShopInput) {
  const fields: Record<string, unknown> = { shopEyebrow: input.shopEyebrow.trim() };
  if (input.shopBannerImage) fields.shopBannerImage = imageValue(input.shopBannerImage);
  return commit(() => patchCopy(fields), "The shop page is updated.");
}

export async function saveStory(input: StoryInput) {
  const fields: Record<string, unknown> = {
    meaning: input.meaning.trim(),
    mission: input.mission,
    vision: input.vision,
    people: input.people,
    values: input.values.map((value) => ({
      _type: "value",
      _key: value.key,
      title: value.title.trim(),
      body: value.body,
    })),
    processSteps: input.processSteps.map((step) => ({
      _type: "processStep",
      _key: step.key,
      title: step.title.trim(),
      body: step.body,
      ...(step.image ? { image: imageValue(step.image) } : {}),
    })),
  };

  const unset: string[] = [];
  for (const [field, value] of [
    ["storyHeroImage", input.storyHeroImage],
    ["missionImage", input.missionImage],
  ] as const) {
    if (value) fields[field] = imageValue(value);
    else unset.push(field);
  }

  return commit(() => patchCopy(fields, unset), "Our story is updated.");
}

export async function saveLookbookCopy(input: LookbookInput) {
  return commit(
    () =>
      patchCopy({
        lookbookEyebrow: input.lookbookEyebrow.trim(),
        lookbookIntro: input.lookbookIntro,
      }),
    "The lookbook text is updated.",
  );
}

export async function saveContact(input: ContactInput) {
  const fields: Record<string, unknown> = {
    email: input.email.trim(),
    phone: input.phone.trim(),
    social: input.social.trim(),
    studio: input.studio.trim(),
    shippingCopy: input.shippingCopy,
  };
  const unset: string[] = [];
  if (input.contactImage) fields.contactImage = imageValue(input.contactImage);
  else unset.push("contactImage");

  return commit(() => patchCopy(fields, unset), "Contact details updated.");
}
