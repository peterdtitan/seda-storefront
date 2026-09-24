import type { Metadata } from "next";

import { SanityImage } from "@/components/SanityImage";
import { StateMessage } from "@/components/ui/StateMessage";
import { Cta, Outline } from "@/components/ui/Button";
import { BrandBody, Display, Eyebrow, UiLabel } from "@/components/ui/Text";
import { sanityFetch } from "@/sanity/lib/client";
import { STORY_QUERY } from "@/sanity/lib/queries";
import type { SanityImage as SanityImageValue } from "@/sanity/lib/types";

import s from "./story.module.css";

export const metadata: Metadata = {
  title: "Our story — Șèdá",
  description: "Șèdá is a Yoruba word meaning to create. Contemporary Adire, made in Lagos.",
};

type Story = {
  meaning: string;
  storyHeroImage: SanityImageValue;
  mission: string;
  vision: string;
  missionImage: SanityImageValue;
  values: { _key: string; title: string; body: string }[];
  processSteps: { _key: string; title: string; body: string; image?: SanityImageValue }[];
  people: string;
};

export default async function StoryPage() {
  const copy = await sanityFetch<Story>(STORY_QUERY);

  // Every word on this page comes from the CMS, so without it there is no page —
  // only a run of empty headings, starting with an h1 that says nothing.
  if (!copy) {
    return (
      <StateMessage
        eyebrow="Story unavailable"
        tone="fault"
        title="We cannot tell you our story right now"
        as="h1"
        body="This page is written entirely in our studio journal, and it is not answering. The shop and lookbook may still be working."
      >
        <Cta href="/story">Try again</Cta>
        <Outline href="/shop">Go to the shop</Outline>
      </StateMessage>
    );
  }

  return (
    <>
      <section className={s.hero}>
        <SanityImage image={copy?.storyHeroImage} sizes="100vw" fill priority alt="" />
        <span className={s.heroWash} aria-hidden="true" />
        <div className={s.heroCopy}>
          <Eyebrow colour="var(--seda-cream)">Our story</Eyebrow>
          <Display as="h1" colour="var(--seda-cream)" className={s.heroTitle}>
            {copy?.meaning}
          </Display>
        </div>
      </section>

      <section className={s.mission}>
        <div>
          <Display as="h2" className={s.missionHeading}>
            Mission
          </Display>
          <BrandBody className={s.missionBody}>{copy?.mission}</BrandBody>

          <Display as="h2" className={s.visionHeading}>
            Vision
          </Display>
          <BrandBody className={s.missionBody}>{copy?.vision}</BrandBody>
        </div>
        <div className={s.missionImage}>
          <SanityImage image={copy?.missionImage} sizes="(max-width: 768px) 100vw, 50vw" fill />
        </div>
      </section>

      <section className={s.values} data-theme="oxblood">
        <Eyebrow as="h2" colour="var(--text-on-inverse-muted)">
          Core values
        </Eyebrow>
        <div className={s.valuesGrid}>
          {(copy?.values ?? []).map((value) => (
            <div key={value._key}>
              <Display as="h3" colour="var(--seda-cream)" className={s.valueTitle}>
                {value.title}
              </Display>
              <BrandBody colour="var(--text-on-inverse-muted)" max="34ch" className={s.valueBody}>
                {value.body}
              </BrandBody>
            </div>
          ))}
        </div>
      </section>

      <section className={s.process} id="process">
        <Eyebrow as="h2">Creative process</Eyebrow>
        <div className={s.processGrid}>
          {(copy?.processSteps ?? []).map((step, i) => (
            <div key={step._key}>
              <div className={s.processImage}>
                <SanityImage
                  image={step.image}
                  sizes="(max-width: 768px) 100vw, (max-width: 1100px) 50vw, 25vw"
                  fill
                  alt=""
                />
              </div>
              <UiLabel colour="var(--text-muted)" className={s.processNumber}>
                {String(i + 1).padStart(2, "0")}
              </UiLabel>
              <Display as="h3" className={s.processTitle}>
                {step.title}
              </Display>
              <p className={s.processBody}>{step.body}</p>
            </div>
          ))}
        </div>

        <BrandBody max="56ch" size="20px" className={s.closing}>
          {copy?.people}
        </BrandBody>
      </section>
    </>
  );
}
