import type { Metadata } from "next";

import { SanityImage } from "@/components/SanityImage";
import { LookLightbox, LookTrigger, type LightboxLook } from "./LookLightbox";
import { Scrim } from "@/components/ui/Scrim";
import { StateMessage } from "@/components/ui/StateMessage";
import { Cta, Outline } from "@/components/ui/Button";
import { BrandBody, Display, Eyebrow } from "@/components/ui/Text";
import type { SanityImage as SanityImageValue } from "@/sanity/lib/types";
import { sanityFetch } from "@/sanity/lib/client";
import { LOOKBOOK_QUERY } from "@/sanity/lib/queries";

import s from "./lookbook.module.css";

export const metadata: Metadata = {
  title: "Lookbook — Șèdá",
  description: "A visual diary of Drop 01 — on the street, in the studio, in the gallery.",
};

type Look = {
  _id: string;
  title?: string;
  order: number;
  feature?: boolean;
  image: SanityImageValue;
  supportingImages?: SanityImageValue[];
};

type LookbookData = {
  copy: { lookbookEyebrow: string; lookbookIntro: string } | null;
  looks: Look[] | null;
};

function lookLabel(look: Look) {
  const number = `Look ${String(look.order).padStart(2, "0")}`;
  return look.title ? `${number} — ${look.title}` : number;
}

export default async function LookbookPage() {
  const data = await sanityFetch<LookbookData>(LOOKBOOK_QUERY);
  const looks = data?.looks ?? [];

  const feature = looks.find((look) => look.feature) ?? looks[0];
  const rest = looks.filter((look) => look._id !== feature?._id);

  const lightboxLooks: LightboxLook[] = looks.map((look) => ({
    _id: look._id,
    slug: String(look.order).padStart(2, "0"),
    label: lookLabel(look),
    image: look.image,
  }));

  return (
    <>
      <header className={s.header}>
        <Eyebrow>{data?.copy?.lookbookEyebrow}</Eyebrow>
        <Display as="h1" className={s.title}>
          Lookbook
        </Display>
        <BrandBody max="52ch" className={s.intro}>
          {data?.copy?.lookbookIntro}
        </BrandBody>
      </header>

      {data === null && (
        <StateMessage
          eyebrow="Lookbook unavailable"
          tone="fault"
          title="The lookbook is not loading"
          body="The images are still there — our catalogue just is not answering right now. The shop may still be working."
        >
          <Cta href="/lookbook">Try again</Cta>
          <Outline href="/shop">Go to the shop</Outline>
        </StateMessage>
      )}

      {data !== null && looks.length === 0 && (
        <StateMessage
          eyebrow="Coming soon"
          title="The Drop 01 lookbook is being shot"
          body="We photograph each drop once the full run is finished. It will be here shortly — the pieces are already in the shop."
        >
          <Cta href="/shop">Shop the drop</Cta>
        </StateMessage>
      )}

      <LookLightbox looks={lightboxLooks}>
        {feature && (
          <section className={s.feature}>
            <figure className={s.featureHero}>
              <LookTrigger id={feature._id} label={lookLabel(feature)}>
                <SanityImage
                  image={feature.image}
                  sizes="(max-width: 768px) 100vw, 66vw"
                  fill
                  priority
                  alt=""
                />
              </LookTrigger>
              <Scrim />
              <Display as="figcaption" colour="var(--seda-cream)" className={s.captionLarge}>
                {lookLabel(feature)}
              </Display>
            </figure>

            {(feature.supportingImages?.length ?? 0) > 0 && (
              <div className={s.support}>
                {feature.supportingImages!.slice(0, 2).map((image, i) => (
                  <div key={image.asset?._id ?? i} className={s.supportCell}>
                    <SanityImage image={image} sizes="(max-width: 768px) 98vw, 33vw" fill />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {rest.length > 0 && (
          <section className={s.grid}>
            {rest.map((look) => (
              <figure key={look._id} className={s.cell}>
                <LookTrigger id={look._id} label={lookLabel(look)}>
                  <SanityImage
                    image={look.image}
                    sizes="(max-width: 1100px) 50vw, 33vw"
                    fill
                    alt=""
                  />
                </LookTrigger>
                <Scrim />
                <Display as="figcaption" colour="var(--seda-cream)" className={s.caption}>
                  {lookLabel(look)}
                </Display>
              </figure>
            ))}
          </section>
        )}
      </LookLightbox>
    </>
  );
}
