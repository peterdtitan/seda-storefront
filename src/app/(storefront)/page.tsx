import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { SanityImage } from "@/components/SanityImage";
import { Cta, Outline } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { StateMessage } from "@/components/ui/StateMessage";
import { SITE, absoluteUrl } from "@/lib/site";
import { organisationJsonLd } from "@/lib/seo";
import { BrandBody, Display, Eyebrow } from "@/components/ui/Text";
import { toCards, type Product } from "@/lib/catalogue";
import { sanityFetch } from "@/sanity/lib/client";
import { HOME_QUERY } from "@/sanity/lib/queries";
import type { DesignStudy, SiteCopy } from "@/sanity/lib/types";

import s from "./home.module.css";

type HomeData = {
  copy: SiteCopy | null;
  products: Product[] | null;
  designStudy: DesignStudy | null;
};

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { title: SITE.title, description: SITE.description, url: "/" },
};

export default async function HomePage() {
  const data = await sanityFetch<HomeData>(HOME_QUERY);
  const copy = data?.copy;
  const cards = toCards(data?.products ?? []).slice(0, 3);
  const study = data?.designStudy;

  // The front door has to say the brand's name even with nothing behind it, so the
  // hero holds its own copy rather than rendering an h1 with no words in it.
  const heroEyebrow = copy?.heroEyebrow || "Drop 01 · Lagos";
  const heroHeadline = copy?.heroHeadline || "Contemporary Adire";
  const tagline = copy?.tagline || "Made in Nigeria, designed for it too.";

  return (
    <>
      <JsonLd data={organisationJsonLd(absoluteUrl, absoluteUrl("/logo/wordmark-oxblood.png"))} />

      <section className={s.hero}>
        <SanityImage
          image={copy?.heroImage}
          sizes="100vw"
          fill
          priority
          alt={copy?.heroImage?.alt ?? ""}
        />
        <span className={s.heroScrim} aria-hidden="true" />
        <div className={s.heroCopy}>
          <Eyebrow colour="var(--seda-cream)">{heroEyebrow}</Eyebrow>
          <Display
            as="h1"
            colour="var(--seda-cream)"
            className={s.heroHeadline}
            style={{ whiteSpace: "pre-line" }}
          >
            {heroHeadline}
          </Display>
          <BrandBody colour="var(--seda-cream)" max="40ch" className={s.heroTagline}>
            {tagline}
          </BrandBody>
          <div className={s.heroActions}>
            <Cta tone="cream" href="/shop">
              Shop the drop
            </Cta>
            <Outline tone="cream" href="/lookbook" className={s.lookbookCta}>
              Lookbook
            </Outline>
          </div>
        </div>
      </section>

      <section className={s.drop}>
        <div className={s.dropHead}>
          <Display as="h2" className={s.dropTitle}>
            New this drop
          </Display>
          <span className="seda-rule-grow" aria-hidden="true" />
          <Link href="/shop" className={s.allLink}>
            All
          </Link>
        </div>
        {cards.length === 0 && (
          <StateMessage
            compact
            eyebrow={data === null ? "Catalogue unavailable" : "Coming soon"}
            tone={data === null ? "fault" : "quiet"}
            title={data === null ? "We cannot reach the drop right now" : "Drop 01 lands shortly"}
            body={
              data === null
                ? "The pieces are still here — our catalogue just is not answering. Try the shop in a moment."
                : "Every piece is dyed and sewn in short runs. The first release is nearly ready."
            }
          />
        )}

        <div className={s.dropGrid}>
          {cards.map((card) => (
            <ProductCard
              key={card.key}
              card={card}
              height="360px"
              sizes="(max-width: 768px) 48vw, (max-width: 1100px) 44vw, 30vw"
            />
          ))}
        </div>
      </section>

      {/* The manifesto is nothing but CMS prose. Without it the band renders as an
          empty h2 over an oxblood block, so drop the section rather than the copy. */}
      {copy?.manifestoHeadline && (
        <section className={s.manifesto} data-theme="oxblood">
          <div className={s.manifestoMark} aria-hidden="true">
            <Logo kind="mark" tone="cream" height={400} alt="" />
          </div>
          <div className={s.manifestoCopy}>
            <Eyebrow colour="var(--text-on-inverse-muted)">{copy?.manifestoEyebrow}</Eyebrow>
            <Display as="h2" colour="var(--seda-cream)" className={s.manifestoHeadline}>
              {copy?.manifestoHeadline}
            </Display>
            <BrandBody colour="var(--text-on-inverse-muted)" max="46ch" className={s.manifestoBody}>
              {copy?.manifestoBody}
            </BrandBody>
            <div className={s.manifestoActions}>
              <Outline tone="cream" href="/story">
                Our story
              </Outline>
            </div>
          </div>
          <div className={s.manifestoImage}>
            <SanityImage image={copy?.manifestoImage} sizes="420px" fill />
          </div>
        </section>
      )}

      <section className={s.strip}>
        {(copy?.stripImages ?? []).map((image, i) => (
          <div key={image.asset?._id ?? i} className={s.stripCell}>
            <SanityImage image={image} sizes="(max-width: 1100px) 50vw, 25vw" fill />
          </div>
        ))}
      </section>

      {study && (
        <section className={s.study}>
          <Eyebrow>Design study</Eyebrow>
          <Display as="h2" className={s.studyTitle}>
            {study.name}
          </Display>
          <BrandBody max="56ch" className={s.studyBody}>
            {study.description}
          </BrandBody>
          <div className={s.studyActions}>
            <Cta href={`/product/${study.slug}`}>Read the study</Cta>
          </div>
        </section>
      )}
    </>
  );
}
