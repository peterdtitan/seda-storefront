/**
 * Seeds the dataset with the eight cards, seven looks and the COPY strings from the
 * design reference.
 *
 *   pnpm seed          (wraps: sanity exec scripts/seed.ts --with-user-token)
 *
 * Idempotent: every document has a fixed _id and is written with createOrReplace, and
 * each photograph is uploaded once under a deterministic label and reused after that.
 * Re-running overwrites seed content and leaves anything the client has since added.
 *
 * It does NOT delete. To start clean: pnpm dlx sanity dataset delete production.
 *
 * Document ids use hyphens, never dots. Sanity treats a dot in an _id as a path
 * prefix and such documents are not readable without a token — the storefront reads
 * the published dataset unauthenticated, so a dotted id silently yields an empty shop.
 */

import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";

import { getCliClient } from "sanity/cli";

import { assetPath, assetsDir, type ImageKey } from "./assets";

const client = getCliClient({ apiVersion: "2026-09-22" });

const NAIRA = 100; // kobo per naira

type ImageRef = {
  _type: "productImage";
  asset: { _type: "reference"; _ref: string };
  alt?: string;
  decorative?: boolean;
};

const uploaded = new Map<ImageKey, string>();

/** Uploads once per run, and reuses the asset already in the dataset across runs. */
async function image(key: ImageKey, alt: string, decorative = false): Promise<ImageRef> {
  let id = uploaded.get(key);

  if (!id) {
    const label = `seda-${key}`;
    const existing = await client.fetch<{ _id: string } | null>(
      `*[_type == "sanity.imageAsset" && label == $label][0]{_id}`,
      { label },
    );

    if (existing) {
      id = existing._id;
    } else {
      const file = assetPath(key);
      await access(file);
      const asset = await client.assets.upload("image", createReadStream(file), {
        filename: `${key}.png`,
        label,
        title: alt,
      });
      id = asset._id;
      console.log(`  uploaded ${key}`);
    }
    uploaded.set(key, id);
  }

  return {
    _type: "productImage",
    asset: { _type: "reference", _ref: id },
    ...(decorative ? { decorative: true } : { alt }),
  };
}

const ref = (id: string) => ({ _type: "reference" as const, _ref: id });

/** Stock rows. Every colourway carries all four sizes; zero everywhere means sold out. */
const stock = (s: number, m: number, l: number, xl: number) =>
  [
    { _key: "S", _type: "sizeStock", size: "S", quantity: s },
    { _key: "M", _type: "sizeStock", size: "M", quantity: m },
    { _key: "L", _type: "sizeStock", size: "L", quantity: l },
    { _key: "XL", _type: "sizeStock", size: "XL", quantity: xl },
  ] as const;

const slug = (current: string) => ({ _type: "slug" as const, current });

async function main() {
  console.log(`Seeding ${client.config().dataset} from ${assetsDir}\n`);

  // --- Categories -----------------------------------------------------------
  const categories = [
    { _id: "category-bottoms", title: "Bottoms", order: 1 },
    { _id: "category-tops", title: "Tops", order: 2 },
    { _id: "category-sets", title: "Sets", order: 3 },
    { _id: "category-outerwear", title: "Outerwear", order: 4 },
  ];

  for (const c of categories) {
    await client.createOrReplace({
      _type: "category",
      _id: c._id,
      title: c.title,
      slug: slug(c.title.toLowerCase()),
      order: c.order,
    });
  }
  console.log(`categories: ${categories.length}`);

  // --- Products -------------------------------------------------------------
  // Six garments, eight colourways — the shop grid renders one card per colourway,
  // which is how the design shows three Dart Cargos cards for one pattern.

  const cargoWhy =
    "Cargo pants were chosen because they represent contemporary everyday clothing. Pairing this familiar silhouette with handcrafted Adire shows how traditional textile techniques can be modified for modern fashion.";
  const care =
    "Hand wash cold. Dry flat, out of direct sun. Dye may transfer on first wash — wash separately.";
  const shipping = "Free delivery in Lagos. 3–5 days nationwide, 7–14 days international.";

  // One transaction: pairsWith points at products created in the same batch, and
  // Sanity resolves references across a transaction but not across separate requests.
  const products = client.transaction();

  products.createOrReplace({
    _type: "product",
    _id: "product-dart-cargos",
    name: "The Dart Cargos",
    slug: slug("the-dart-cargos"),
    category: ref("category-bottoms"),
    active: true,
    order: 1,
    priceKobo: 48_000 * NAIRA,
    description: cargoWhy,
    details:
      "Boxed pleated flap pockets, angled side-entry pockets, elastic back waistband, detachable drawstring hem.",
    care,
    shipping,
    research:
      "Research showed repeated dyeing can weaken lightweight cotton, leading us to use heavier-weight fabrics for improved durability.",
    colourways: [
      {
        _key: "teal",
        _type: "colourway",
        name: "Teal Adire",
        slug: slug("teal-adire"),
        swatch: "#065073",
        images: [
          await image("cargoTeal", "The Dart Cargos in teal Adire, worn straight on"),
          await image("adireMushroom", "Close detail of the resist-dyed cloth"),
          await image("packaging", "The cargos folded in Șèdá packaging"),
        ],
        // The product page's low-stock notice reads "Only 4 left in Teal Adire, M."
        stock: stock(9, 4, 12, 6),
      },
      {
        _key: "coral",
        _type: "colourway",
        name: "Coral Adire",
        slug: slug("coral-adire"),
        swatch: "#C16B54",
        images: [
          await image("cargoCoral", "The Dart Cargos in coral Adire"),
          await image("adireOchre", "Close detail of the coral resist-dyed cloth"),
        ],
        stock: stock(5, 8, 7, 3),
      },
      {
        _key: "indigo",
        _type: "colourway",
        name: "Indigo Adire",
        slug: slug("indigo-adire"),
        swatch: "#133656",
        images: [
          await image("cargoIndigo", "The Dart Cargos in indigo Adire"),
          await image("adireIndigo", "Close detail of the indigo resist-dyed cloth"),
        ],
        // Sold out in the design — every size at zero, not a flag.
        stock: stock(0, 0, 0, 0),
      },
    ],
    pairsWith: [
      "product-adire-crew-tee",
      "product-cowrie-tee",
      "product-studio-robe",
      "product-resist-set",
    ].map((id) => ({ _key: id, ...ref(id) })),
  });

  products.createOrReplace({
    _type: "product",
    _id: "product-adire-crew-tee",
    name: "Adire Crew Tee",
    slug: slug("adire-crew-tee"),
    category: ref("category-tops"),
    active: true,
    order: 2,
    priceKobo: 22_000 * NAIRA,
    description:
      "A heavier-weight crew cut from the same hand-dyed cloth as the cargos. Cut to sit square, not boxy.",
    details: "Ribbed crew neck, dropped shoulder, double-stitched hem. 240gsm cotton.",
    care,
    shipping,
    colourways: [
      {
        _key: "indigo",
        _type: "colourway",
        name: "Indigo",
        slug: slug("indigo"),
        swatch: "#133656",
        images: [await image("teeIndigo", "The Adire Crew Tee in indigo")],
        stock: stock(11, 14, 9, 4),
      },
    ],
  });

  products.createOrReplace({
    _type: "product",
    _id: "product-cowrie-tee",
    name: "Cowrie Tee",
    slug: slug("cowrie-tee"),
    category: ref("category-tops"),
    active: true,
    order: 3,
    priceKobo: 24_000 * NAIRA,
    description:
      "The cowrie mark, hand-block printed at the chest. The shell was currency before it was ornament.",
    details: "Ribbed crew neck, hand-block printed mark, double-stitched hem. 240gsm cotton.",
    care,
    shipping,
    colourways: [
      {
        _key: "black",
        _type: "colourway",
        name: "Black",
        slug: slug("black"),
        swatch: "#14100E",
        images: [await image("cowrie", "The Cowrie Tee in black, mark printed at the chest")],
        stock: stock(6, 10, 8, 5),
      },
    ],
  });

  products.createOrReplace({
    _type: "product",
    _id: "product-studio-robe",
    name: "Studio Robe",
    slug: slug("studio-robe"),
    category: ref("category-outerwear"),
    active: true,
    order: 4,
    priceKobo: 64_000 * NAIRA,
    description:
      "An unlined robe in undyed cotton, cut long. Made to be thrown on over everything else in the drop.",
    details: "Open front, patch pockets, self-tie belt, single back pleat.",
    care,
    shipping,
    colourways: [
      {
        _key: "sand",
        _type: "colourway",
        name: "Sand",
        slug: slug("sand"),
        swatch: "#C4B8A6",
        images: [await image("robeSand", "The Studio Robe in sand, worn open")],
        stock: stock(3, 5, 4, 2),
      },
    ],
  });

  products.createOrReplace({
    _type: "product",
    _id: "product-resist-set",
    name: "Resist Set",
    slug: slug("resist-set"),
    category: ref("category-sets"),
    active: true,
    order: 5,
    priceKobo: 86_000 * NAIRA,
    description:
      "Shirt and trouser cut from one run of cloth, so the resist pattern carries across the pair.",
    details: "Camp collar shirt, straight-leg trouser, elastic back waistband. Sold as a set.",
    care,
    shipping,
    colourways: [
      {
        _key: "indigo",
        _type: "colourway",
        name: "Indigo",
        slug: slug("indigo"),
        swatch: "#133656",
        images: [await image("setIndigo", "The Resist Set in indigo, shirt and trouser")],
        stock: stock(2, 4, 3, 2),
      },
    ],
  });

  products.createOrReplace({
    _type: "product",
    _id: "product-tie-dye-shirt",
    name: "Tie-Dye Shirt",
    slug: slug("tie-dye-shirt"),
    category: ref("category-tops"),
    active: true,
    order: 6,
    priceKobo: 38_000 * NAIRA,
    description:
      "Tied and dyed by hand, so no two are the same. The rust comes from a second pass over the first dye.",
    details: "Camp collar, single chest pocket, curved hem. Hand-tied, twice dyed.",
    care,
    shipping,
    colourways: [
      {
        _key: "rust",
        _type: "colourway",
        name: "Rust",
        slug: slug("rust"),
        swatch: "#A06F5E",
        images: [await image("rust", "The Tie-Dye Shirt in rust")],
        stock: stock(4, 6, 5, 3),
      },
    ],
  });
  await products.commit();
  console.log("products: 6 garments, 8 colourways");

  // --- Lookbook -------------------------------------------------------------
  const looks: {
    id: string;
    order: number;
    title?: string;
    key: ImageKey;
    alt: string;
    feature?: boolean;
    supporting?: [ImageKey, string][];
    products?: string[];
  }[] = [
    {
      id: "look-01",
      order: 1,
      title: "Resist Set",
      key: "indigoFull",
      alt: "Full-length look in the indigo Resist Set",
      feature: true,
      supporting: [
        ["setIndigo", "The Resist Set, shirt and trouser laid flat"],
        ["rust", "The Tie-Dye Shirt in rust"],
      ],
      products: ["product-resist-set"],
    },
    { id: "look-02", order: 2, key: "blueRobe", alt: "Blue robe worn open over the crew tee" },
    {
      id: "look-03",
      order: 3,
      key: "robeSand",
      alt: "The Studio Robe in sand",
      products: ["product-studio-robe"],
    },
    {
      id: "look-04",
      order: 4,
      key: "sunflower",
      alt: "Orange resist-dyed cloth against a sunlit wall",
    },
    {
      id: "look-05",
      order: 5,
      key: "cowrie",
      alt: "The Cowrie Tee in black",
      products: ["product-cowrie-tee"],
    },
    { id: "look-06", order: 6, key: "street", alt: "The drop worn on a Lagos street" },
    { id: "look-07", order: 7, key: "studio", alt: "The drop photographed in the studio" },
  ];

  for (const l of looks) {
    await client.createOrReplace({
      _type: "look",
      _id: l.id,
      order: l.order,
      ...(l.title ? { title: l.title } : {}),
      feature: Boolean(l.feature),
      image: await image(l.key, l.alt),
      ...(l.supporting
        ? {
            supportingImages: await Promise.all(
              l.supporting.map(async ([key, alt], i) => ({
                _key: `s${i}`,
                ...(await image(key, alt)),
              })),
            ),
          }
        : {}),
      ...(l.products ? { products: l.products.map((id) => ({ _key: id, ...ref(id) })) } : {}),
    });
  }
  console.log(`looks: ${looks.length}`);

  // --- Site copy ------------------------------------------------------------
  await client.createOrReplace({
    _type: "siteCopy",
    _id: "siteCopy",
    tagline: "Made in Nigeria, designed for it too.",
    heroEyebrow: "Drop 01 · Lagos",
    heroHeadline: "Contemporary\nAdire",
    heroImage: await image("mural", "A mural wall in Lagos, the drop photographed against it"),
    manifestoEyebrow: "Culturally conscious · Quality · Contemporary",
    manifestoHeadline: "We believe clothing should feel like art you can actually live in.",
    manifestoBody:
      "Every piece is crafted with enough intention that it earns a place in your daily routine, not just your wardrobe.",
    manifestoImage: await image("fabricFolded", "Folded indigo Adire cloth"),
    stripImages: await Promise.all(
      (
        [
          ["street", "The drop worn on a Lagos street"],
          ["studio", "The drop photographed in the studio"],
          ["sunflower", "Orange resist-dyed cloth against a sunlit wall"],
          ["splash", "Dye splashing across cloth"],
        ] as [ImageKey, string][]
      ).map(async ([key, alt], i) => ({ _key: `strip${i}`, ...(await image(key, alt)) })),
    ),
    designStudyProduct: ref("product-dart-cargos"),

    meaning: "Șèdá is a Yoruba word meaning to create.",
    storyHeroImage: await image("fabricBlockprint", "Hand-block printing in progress"),
    mission:
      "At Șèdá, our goal is to make striking Adire. We believe in quality over quantity — that true luxury is found in intentionality, in great craftsmanship and in how confident our pieces make you feel.",
    vision: "The vision is simple: to reinvent what modern African design looks like.",
    missionImage: await image("fabricMushroom", "Mushroom-dyed cloth drying"),
    values: [
      {
        _key: "conscious",
        _type: "value",
        title: "Culturally Conscious",
        body: "Adire is a living tradition. Șèdá is a chapter of it, not a borrowing from it.",
      },
      {
        _key: "quality",
        _type: "value",
        title: "Quality",
        body: "Quality over quantity — heavier-weight cottons, hand-block prints, finishing you can feel.",
      },
      {
        _key: "contemporary",
        _type: "value",
        title: "Contemporary",
        body: "Familiar silhouettes, traditional technique. Reinventing what modern African design looks like.",
      },
    ],
    processSteps: [
      {
        _key: "research",
        _type: "processStep",
        title: "Research",
        body: "Studying resist-dye technique, cloth weight and wear.",
        image: await image("fabricBlockprint", "Hand-block printing in progress"),
      },
      {
        _key: "pattern",
        _type: "processStep",
        title: "Pattern",
        body: "Translating motifs into batik patterns rather than copying them.",
        image: await image("adireOchre", "Ochre Adire pattern tile", true),
      },
      {
        _key: "dye",
        _type: "processStep",
        title: "Dye",
        body: "Hand-block printing and repeat dyeing on heavier cotton.",
        image: await image("adireIndigo", "Indigo Adire pattern tile", true),
      },
      {
        _key: "garment",
        _type: "processStep",
        title: "Garment",
        body: "Cutting familiar contemporary silhouettes from the finished cloth.",
        image: await image("cargoCoral", "The Dart Cargos in coral Adire"),
      },
    ],
    people: "If you care about what you wear and care about quality, you'll find your people here.",

    lookbookEyebrow: "Drop 01 · Lagos, 2026",
    lookbookIntro:
      "A visual diary of the collection — on the street, in the studio, in the gallery.",

    email: "wearsedastudio@gmail.com",
    phone: "08160110390",
    social: "@wear_seda",
    studio: "Lagos · Abuja",
    contactImage: await image("packaging", "Șèdá packaging, folded and tied"),
    shippingCopy: shipping,
  });
  console.log("site copy: 1 singleton\n");
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
