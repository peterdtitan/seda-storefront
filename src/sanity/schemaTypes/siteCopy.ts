import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * Every string the design hard-codes in shared.jsx's COPY object, as one editable
 * singleton. Voice: plain, confident, unhurried. Sentence case for body copy, never
 * title case, no full stop on a heading, British/Nigerian spelling, no emoji.
 */
export const siteCopy = defineType({
  name: "siteCopy",
  title: "Site copy",
  type: "document",
  groups: [
    { name: "home", title: "Home", default: true },
    { name: "story", title: "Our story" },
    { name: "lookbook", title: "Lookbook" },
    { name: "contact", title: "Contact" },
  ],
  fields: [
    defineField({
      name: "tagline",
      description: "Under the hero headline and in the footer.",
      type: "string",
      group: "home",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "heroEyebrow",
      type: "string",
      group: "home",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "heroHeadline",
      description: "Line break where the design breaks it: Contemporary / Adire.",
      type: "text",
      rows: 2,
      group: "home",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "heroImage",
      type: "productImage",
      group: "home",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "manifestoEyebrow",
      type: "string",
      group: "home",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "manifestoHeadline",
      description: "The oxblood band. Clothing should feel like art you can actually live in.",
      type: "text",
      rows: 3,
      group: "home",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "manifestoBody",
      type: "text",
      rows: 3,
      group: "home",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "manifestoImage",
      type: "productImage",
      group: "home",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "stripImages",
      title: "Image strip",
      description: "Four full-bleed photographs between the manifesto and the design study.",
      type: "array",
      of: [defineArrayMember({ type: "productImage" })],
      group: "home",
      validation: (rule) => rule.required().length(4),
    }),
    defineField({
      name: "designStudyProduct",
      title: "Design study",
      description: "The garment the home page's closing study points at.",
      type: "reference",
      to: [{ type: "product" }],
      group: "home",
    }),

    defineField({
      name: "meaning",
      description: "The story hero. Șèdá is a Yoruba word meaning to create.",
      type: "string",
      group: "story",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "storyHeroImage", type: "productImage", group: "story" }),
    defineField({
      name: "mission",
      type: "text",
      rows: 4,
      group: "story",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "vision",
      type: "text",
      rows: 3,
      group: "story",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "missionImage", type: "productImage", group: "story" }),
    defineField({
      name: "values",
      title: "Core values",
      type: "array",
      group: "story",
      of: [
        defineArrayMember({
          type: "object",
          name: "value",
          fields: [
            defineField({ name: "title", type: "string", validation: (rule) => rule.required() }),
            defineField({
              name: "body",
              type: "text",
              rows: 3,
              validation: (rule) => rule.required(),
            }),
          ],
        }),
      ],
      validation: (rule) => rule.required().length(3),
    }),
    defineField({
      name: "processSteps",
      title: "Creative process",
      type: "array",
      group: "story",
      of: [
        defineArrayMember({
          type: "object",
          name: "processStep",
          fields: [
            defineField({ name: "title", type: "string", validation: (rule) => rule.required() }),
            defineField({
              name: "body",
              type: "text",
              rows: 3,
              validation: (rule) => rule.required(),
            }),
            defineField({ name: "image", type: "productImage" }),
          ],
          preview: { select: { title: "title", media: "image.asset" } },
        }),
      ],
      validation: (rule) => rule.required().length(4),
    }),
    defineField({
      name: "people",
      title: "Closing line",
      description: "If you care about what you wear and care about quality…",
      type: "text",
      rows: 3,
      group: "story",
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: "lookbookIntro",
      type: "text",
      rows: 3,
      group: "lookbook",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "lookbookEyebrow",
      type: "string",
      group: "lookbook",
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: "email",
      type: "string",
      group: "contact",
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: "phone",
      description: "Unformatted, the way the brand writes it: 08160110390.",
      type: "string",
      group: "contact",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "social",
      type: "string",
      group: "contact",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "studio",
      description: "Lagos · Abuja",
      type: "string",
      group: "contact",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "contactImage", type: "productImage", group: "contact" }),
    defineField({
      name: "shippingCopy",
      title: "Site-wide shipping copy",
      description: "The product page's Shipping tab when a garment does not override it.",
      type: "text",
      rows: 3,
      group: "contact",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: { prepare: () => ({ title: "Site copy" }) },
});
