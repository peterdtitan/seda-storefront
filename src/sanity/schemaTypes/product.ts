import { defineArrayMember, defineField, defineType } from "sanity";

import { formatNaira } from "@/lib/money";

export const product = defineType({
  name: "product",
  title: "Product",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "commerce", title: "Price & stock" },
    { name: "copy", title: "Details & care" },
  ],
  fields: [
    defineField({
      name: "name",
      description: 'The garment — "The Dart Cargos". Not the colour.',
      type: "string",
      group: "content",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
      group: "content",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "category",
      type: "reference",
      to: [{ type: "category" }],
      group: "content",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "active",
      title: "Visible in the shop",
      description: "Untick to pull the garment without deleting it or its order history.",
      type: "boolean",
      initialValue: true,
      group: "content",
    }),
    defineField({
      name: "order",
      title: "Sort order",
      description: "Lower sorts first. The home page shows the first three.",
      type: "number",
      initialValue: 0,
      group: "content",
      validation: (rule) => rule.integer(),
    }),
    defineField({
      name: "priceKobo",
      title: "Price (kobo)",
      description:
        "Integer minor units: ₦48,000 is 4800000. Stored this way so totals and Paystack amounts are exact.",
      type: "number",
      group: "commerce",
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: "colourways",
      description: "One per colour. The shop grid renders a card for each.",
      type: "array",
      of: [defineArrayMember({ type: "colourway" })],
      group: "commerce",
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "description",
      title: "Rationale",
      description: "The paragraph beside the price. Describe the process, do not claim it.",
      type: "text",
      rows: 4,
      group: "copy",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "details",
      title: "Details tab",
      type: "text",
      rows: 3,
      group: "copy",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "care",
      title: "Care tab",
      type: "text",
      rows: 3,
      group: "copy",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "shipping",
      title: "Shipping tab",
      description: "Leave empty to fall back to the site-wide shipping copy.",
      type: "text",
      rows: 3,
      group: "copy",
    }),
    defineField({
      name: "research",
      title: "Research insight",
      description: "The oxblood band below the product. Omit to hide the band.",
      type: "text",
      rows: 3,
      group: "copy",
    }),
    defineField({
      name: "pairsWith",
      title: "Pairs with",
      description: "Shown four-up beneath the product. Falls back to the newest pieces.",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "product" }] })],
      group: "content",
      validation: (rule) => rule.max(4).unique(),
    }),
  ],
  orderings: [{ title: "Shop order", name: "order", by: [{ field: "order", direction: "asc" }] }],
  preview: {
    select: {
      title: "name",
      media: "colourways.0.images.0.asset",
      priceKobo: "priceKobo",
      category: "category.title",
      active: "active",
    },
    prepare: ({ title, media, priceKobo, category, active }) => ({
      title: active ? title : `${title} (hidden)`,
      media,
      subtitle: [category, typeof priceKobo === "number" ? formatNaira(priceKobo) : null]
        .filter(Boolean)
        .join(" · "),
    }),
  },
});
