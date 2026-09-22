import { defineField, defineType } from "sanity";

/** Bottoms · Tops · Sets · Outerwear — the shop's filter pills. */
export const category = defineType({
  name: "category",
  title: "Category",
  type: "document",
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "order",
      title: "Sort order",
      description:
        "Position in the filter row. The design reads All · Bottoms · Tops · Sets · Outerwear.",
      type: "number",
      validation: (rule) => rule.required().integer().min(0),
    }),
  ],
  orderings: [{ title: "Filter order", name: "order", by: [{ field: "order", direction: "asc" }] }],
  preview: {
    select: { title: "title", subtitle: "slug.current" },
  },
});
