import { defineField, defineType } from "sanity";

/**
 * Every image in the storefront. Hotspot is on because the design crops the same
 * photograph to a 620px hero, a 300px card and a 110px bag thumbnail.
 *
 * `alt` is required. The design reference omits alt text entirely; the storefront
 * cannot, and a required field is the only way it actually gets written.
 */
export const productImage = defineType({
  name: "productImage",
  title: "Image",
  type: "image",
  options: { hotspot: true },
  fields: [
    defineField({
      name: "alt",
      title: "Alt text",
      description:
        "What the photograph shows, for someone who cannot see it. Describe the garment and the cloth, not the mood. Leave empty only if the image is purely decorative.",
      type: "string",
      validation: (rule) =>
        rule.custom((alt, context) => {
          const parent = context.parent as { _type?: string; decorative?: boolean } | undefined;
          if (parent?.decorative) return true;
          return alt ? true : "Add alt text, or mark the image decorative";
        }),
    }),
    defineField({
      name: "decorative",
      title: "Decorative only",
      description: "Tick for texture and pattern fills that carry no information.",
      type: "boolean",
      initialValue: false,
    }),
  ],
  preview: {
    select: { media: "asset", title: "alt" },
    prepare: ({ media, title }) => ({ media, title: title || "Decorative" }),
  },
});
