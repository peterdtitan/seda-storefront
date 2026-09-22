import { defineArrayMember, defineField, defineType } from "sanity";

import { SIZES } from "./sizeStock";

/**
 * A colourway is an object inside a product, not a document of its own: its stock
 * counts and photography belong to that one garment. "Teal Adire" on the cargos and
 * "Teal Adire" on a future shirt are different cloth, cut and inventory.
 *
 * The shop grid renders one card per product-colourway, which is why the eight cards
 * in the design come from six garments.
 */
export const colourway = defineType({
  name: "colourway",
  title: "Colourway",
  type: "object",
  fields: [
    defineField({
      name: "name",
      title: "Colour name",
      description: 'As it appears under the product name — "Teal Adire", "Indigo", "Sand".',
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      type: "slug",
      description: "Used in the product URL to preselect this colour.",
      options: { source: "name", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "swatch",
      title: "Swatch colour",
      description: "Hex for the 26px square in the colour row. Sample it from the cloth.",
      type: "string",
      validation: (rule) => rule.required().regex(/^#[0-9a-fA-F]{6}$/, { name: "six-digit hex" }),
    }),
    defineField({
      name: "images",
      description: "First image is the card and the product hero. Set a hotspot on each.",
      type: "array",
      of: [defineArrayMember({ type: "productImage" })],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "stock",
      title: "Stock by size",
      type: "array",
      of: [defineArrayMember({ type: "sizeStock" })],
      validation: (rule) =>
        rule.required().custom((rows?: { size?: string }[]) => {
          const sizes = (rows ?? []).map((row) => row.size);
          const missing = SIZES.filter((size) => !sizes.includes(size));
          if (missing.length) return `Missing a row for: ${missing.join(", ")}`;
          if (new Set(sizes).size !== sizes.length) return "Each size may only appear once";
          return true;
        }),
    }),
  ],
  preview: {
    select: { title: "name", media: "images.0.asset", stock: "stock" },
    prepare: ({ title, media, stock }) => {
      const units = (stock ?? []).reduce(
        (total: number, row: { quantity?: number }) => total + (row.quantity ?? 0),
        0,
      );
      return { title, media, subtitle: units > 0 ? `${units} units` : "Sold out" };
    },
  },
});
