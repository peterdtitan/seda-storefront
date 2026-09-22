import { defineField, defineType } from "sanity";

export const SIZES = ["S", "M", "L", "XL"] as const;
export type Size = (typeof SIZES)[number];

/**
 * One size's stock inside one colourway. Real counts, not a boolean: the product
 * page's low-stock notice reads "Only 4 left in Teal Adire, M." and has to be true.
 */
export const sizeStock = defineType({
  name: "sizeStock",
  title: "Size",
  type: "object",
  fields: [
    defineField({
      name: "size",
      type: "string",
      options: {
        list: SIZES.map((s) => ({ title: s, value: s })),
        layout: "radio",
        direction: "horizontal",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "quantity",
      title: "Units in stock",
      type: "number",
      initialValue: 0,
      validation: (rule) => rule.required().integer().min(0),
    }),
  ],
  preview: {
    select: { size: "size", quantity: "quantity" },
    prepare: ({ size, quantity }) => ({
      title: size,
      subtitle: quantity > 0 ? `${quantity} in stock` : "Sold out",
    }),
  },
});
