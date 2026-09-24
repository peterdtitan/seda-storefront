import type { Metadata } from "next";

import { SanityImage } from "@/components/SanityImage";
import { Logo } from "@/components/ui/Logo";
import { Rule } from "@/components/ui/Rule";
import { BrandBody, Display, Eyebrow } from "@/components/ui/Text";
import { STUDIO } from "@/lib/studio";
import { sanityFetch } from "@/sanity/lib/client";
import { CONTACT_QUERY } from "@/sanity/lib/queries";
import type { SanityImage as SanityImageValue } from "@/sanity/lib/types";

import { ContactForm } from "./ContactForm";
import s from "./contact.module.css";

export const metadata: Metadata = {
  title: "Get in touch — Șèdá",
  description: "Lagos and Abuja. Custom requests welcome.",
};

type Contact = {
  email: string;
  phone: string;
  social: string;
  studio: string;
  contactImage: SanityImageValue;
};

export default async function ContactPage() {
  const copy = await sanityFetch<Contact>(CONTACT_QUERY);

  // A blank "Email:" is the one failure this page cannot afford, so each line falls
  // back to the studio's own details rather than rendering an empty term.
  const email = copy?.email || STUDIO.email;
  const phone = copy?.phone || STUDIO.phone;
  const social = copy?.social || STUDIO.social;

  const details: { key: string; value: React.ReactNode }[] = [
    { key: "Email:", value: <a href={`mailto:${email}`}>{email}</a> },
    { key: "Phone:", value: <a href={`tel:${phone}`}>{phone}</a> },
    {
      key: "Social Media:",
      value: (
        <a href={`https://instagram.com/${social.replace(/^@/, "")}`} rel="noreferrer noopener">
          {social}
        </a>
      ),
    },
    { key: "Studio:", value: copy?.studio || STUDIO.location },
  ];

  return (
    <div className={s.split}>
      <div className={s.image}>
        <SanityImage
          image={copy?.contactImage}
          sizes="(max-width: 900px) 100vw, 44vw"
          fill
          priority
        />
      </div>

      <div className={s.panel}>
        <div className={s.mark} aria-hidden="true">
          <Logo kind="mark" tone="oxblood" height={300} alt="" />
        </div>

        <Eyebrow>Say hello</Eyebrow>
        <Display as="h1" className={s.title}>
          Get in Touch
        </Display>

        <dl className={s.details}>
          {details.map((detail) => (
            <div key={detail.key}>
              <dt className={s.detailKey}>{detail.key}</dt>
              <BrandBody as="dd" className={s.detailValue}>
                {detail.value}
              </BrandBody>
            </div>
          ))}
        </dl>

        <Rule style={{ margin: "40px 0" }} />

        <ContactForm />
      </div>
    </div>
  );
}
