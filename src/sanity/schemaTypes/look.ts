import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * A lookbook entry. The lookbook lays out one feature look and six smaller ones;
 * `feature` picks which, and `order` sets the Look 01…07 sequence.
 */
export const look = defineType({
  name: "look",
  title: "Look",
  type: "document",
  fields: [
    defineField({
      name: "title",
      description:
        'The caption after the number — "Resist Set" gives "Look 01 — Resist Set". Leave empty and the caption is just "Look 02", which is how the design captions the grid.',
      type: "string",
    }),
    defineField({
      name: "order",
      title: "Look number",
      description: "1 is the feature image. 2 upward fill the grid below it.",
      type: "number",
      validation: (rule) => rule.required().integer().min(1),
    }),
    defineField({
      name: "feature",
      title: "Feature look",
      description: "Renders large, at the top of the page. Exactly one look should be ticked.",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "image",
      type: "productImage",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "supportingImages",
      description:
        "Shown beside the feature look only. The design stacks two of them next to the large image.",
      type: "array",
      of: [defineArrayMember({ type: "productImage" })],
      validation: (rule) => rule.max(2),
    }),
    defineField({
      name: "products",
      title: "Pieces in this look",
      description: "Links the look to the garments it shows.",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "product" }] })],
      validation: (rule) => rule.unique(),
    }),
  ],
  orderings: [{ title: "Look order", name: "order", by: [{ field: "order", direction: "asc" }] }],
  preview: {
    select: { title: "title", order: "order", feature: "feature", media: "image.asset" },
    prepare: ({ title, order, feature, media }) => ({
      title: `Look ${String(order).padStart(2, "0")}${title ? ` — ${title}` : ""}`,
      subtitle: feature ? "Feature" : undefined,
      media,
    }),
  },
});
