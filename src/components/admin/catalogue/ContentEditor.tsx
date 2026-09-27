"use client";

import { newKey } from "@/lib/catalogue/keys";
import type { CopyInput, ProcessStepInput, ValueInput } from "@/lib/catalogue/types";
import {
  validateAnnouncement,
  validateContact,
  validateHome,
  validateLookbook,
  validateShop,
  validateStory,
} from "@/lib/catalogue/validate";

import {
  saveAnnouncement,
  saveContact,
  saveHome,
  saveLookbookCopy,
  saveShop,
  saveStory,
} from "@/app/admin/(shell)/catalogue/actions";
import s from "./catalogue.module.css";
import { SelectField, TextArea, TextField, Toggle } from "./Fields";
import { ImageField, ImageList } from "./ImageField";
import { SectionShell } from "./SectionShell";
import { useSection } from "./useSection";

/**
 * Everything on the storefront that is words or a photograph rather than a garment.
 *
 * Six independent forms over one Sanity document. They are separate because they are
 * used at different moments: the announcement bar changes with a drop, the story page
 * changes once a year, and neither should have to be re-saved to change the other.
 */

export function ContentEditor({
  initial,
  products,
}: {
  initial: CopyInput;
  products: { value: string; label: string }[];
}) {
  return (
    <>
      <Announcement initial={initial.announcement} />
      <Home initial={initial.home} products={products} />
      <Shop initial={initial.shop} />
      <Lookbook initial={initial.lookbook} />
      <Story initial={initial.story} />
      <Contact initial={initial.contact} />
    </>
  );
}

/* ---------- announcement ---------- */

function Announcement({ initial }: { initial: CopyInput["announcement"] }) {
  const form = useSection(initial, validateAnnouncement, saveAnnouncement);
  const { input, patch, errors } = form;

  return (
    <SectionShell
      title="Announcement bar"
      note="The line above the header, on every page. Between drops switch it off rather than deleting the text — it is kept for next time."
      state={form.state}
      pending={form.pending}
      dirty={form.dirty}
      onSave={form.submit}
    >
      <Toggle
        label="Show the bar"
        checked={input.enabled}
        onChange={(enabled) => patch({ enabled })}
      />

      <div className={s.grid} style={{ marginTop: 12 }}>
        <TextField
          label="Message"
          wide
          required={input.enabled}
          maxLength={90}
          hint={`${input.message.length} of 90 characters. It sits above everything, so it has to earn the room.`}
          value={input.message}
          error={errors.message}
          onChange={(message) => patch({ message })}
        />
        <TextField
          label="Link text"
          hint="Optional. Leave empty for a message with nothing to click."
          value={input.linkLabel}
          onChange={(linkLabel) => patch({ linkLabel })}
        />
        <TextField
          label="Link target"
          hint="A path like /shop, or a full https:// address."
          value={input.linkHref}
          error={errors.linkHref}
          onChange={(linkHref) => patch({ linkHref })}
        />
        <DateTime
          label="Show from"
          hint="Optional. Before this it stays hidden even when switched on."
          value={input.startsAt}
          onChange={(startsAt) => patch({ startsAt })}
        />
        <DateTime
          label="Hide after"
          hint="The useful one: an announcement that expires by itself is one nobody has to remember to take down."
          value={input.endsAt}
          error={errors.endsAt}
          onChange={(endsAt) => patch({ endsAt })}
        />
      </div>
    </SectionShell>
  );
}

/** Sanity stores these as ISO instants; the browser's datetime-local wants local time
 * with no zone. Converting in both directions here keeps that ugliness in one place. */
function DateTime({
  label,
  hint,
  value,
  error,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const local = value ? toLocalInput(value) : "";

  return (
    <TextFieldLike
      label={label}
      hint={hint}
      error={error}
      value={local}
      onChange={(next) => onChange(next ? new Date(next).toISOString() : "")}
    />
  );
}

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function TextFieldLike({
  label,
  hint,
  error,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={s.field}>
      <label className={s.label}>
        {label}
        <input
          type="datetime-local"
          className={s.input}
          value={value}
          style={{ marginTop: 4 }}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      {hint && <span className={s.hint}>{hint}</span>}
      {error && (
        <span className={s.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

/* ---------- home ---------- */

function Home({
  initial,
  products,
}: {
  initial: CopyInput["home"];
  products: { value: string; label: string }[];
}) {
  const form = useSection(initial, validateHome, saveHome);
  const { input, patch, errors } = form;

  return (
    <SectionShell
      title="Home page"
      note="The hero, the oxblood manifesto band, the four-photograph strip and the closing design study."
      state={form.state}
      pending={form.pending}
      dirty={form.dirty}
      onSave={form.submit}
    >
      <div className={s.grid}>
        <TextField
          label="Tagline"
          required
          hint="Under the hero headline, and again in the footer."
          value={input.tagline}
          error={errors.tagline}
          onChange={(tagline) => patch({ tagline })}
        />
        <TextField
          label="Hero eyebrow"
          required
          value={input.heroEyebrow}
          error={errors.heroEyebrow}
          onChange={(heroEyebrow) => patch({ heroEyebrow })}
        />
        <TextArea
          label="Hero headline"
          required
          wide
          rows={2}
          hint="Break the line where the design breaks it: Contemporary / Adire."
          value={input.heroHeadline}
          error={errors.heroHeadline}
          onChange={(heroHeadline) => patch({ heroHeadline })}
        />
      </div>

      <div style={{ marginTop: 14 }}>
        <ImageField
          label="Hero photograph"
          value={input.heroImage}
          error={errors.heroImage}
          altError={errors["heroImage.alt"]}
          onChange={(heroImage) => patch({ heroImage })}
        />
      </div>

      <div className={s.grid} style={{ marginTop: 14 }}>
        <TextField
          label="Manifesto eyebrow"
          required
          value={input.manifestoEyebrow}
          error={errors.manifestoEyebrow}
          onChange={(manifestoEyebrow) => patch({ manifestoEyebrow })}
        />
        <TextArea
          label="Manifesto headline"
          required
          wide
          rows={3}
          hint="The oxblood band. Clothing should feel like art you can actually live in."
          value={input.manifestoHeadline}
          error={errors.manifestoHeadline}
          onChange={(manifestoHeadline) => patch({ manifestoHeadline })}
        />
        <TextArea
          label="Manifesto body"
          required
          wide
          value={input.manifestoBody}
          error={errors.manifestoBody}
          onChange={(manifestoBody) => patch({ manifestoBody })}
        />
      </div>

      <div style={{ marginTop: 14 }}>
        <ImageField
          label="Manifesto photograph"
          value={input.manifestoImage}
          error={errors.manifestoImage}
          altError={errors["manifestoImage.alt"]}
          onChange={(manifestoImage) => patch({ manifestoImage })}
        />
      </div>

      <div style={{ marginTop: 14 }}>
        <ImageList
          label="Image strip"
          hint="Exactly four, full width, between the manifesto and the design study."
          values={input.stripImages}
          fixed={4}
          errorAt={(at) => ({
            error: errors[`stripImages.${at}`],
            altError: errors[`stripImages.${at}.alt`],
          })}
          onChange={(stripImages) => patch({ stripImages })}
        />
        {errors.stripImages && (
          <span className={s.error} role="alert">
            {errors.stripImages}
          </span>
        )}
      </div>

      <div className={s.grid} style={{ marginTop: 14 }}>
        <SelectField
          label="Design study"
          placeholder="None"
          hint="The garment the home page's closing study points at."
          value={input.designStudyProduct}
          options={products}
          onChange={(designStudyProduct) => patch({ designStudyProduct })}
        />
      </div>
    </SectionShell>
  );
}

/* ---------- shop ---------- */

function Shop({ initial }: { initial: CopyInput["shop"] }) {
  const form = useSection(initial, validateShop, saveShop);
  const { input, patch, errors } = form;

  return (
    <SectionShell
      title="Shop page"
      note="The banner above the grid. The garments themselves are on the Products tab."
      state={form.state}
      pending={form.pending}
      dirty={form.dirty}
      onSave={form.submit}
    >
      <div className={s.grid}>
        <TextField
          label="Eyebrow"
          required
          value={input.shopEyebrow}
          error={errors.shopEyebrow}
          onChange={(shopEyebrow) => patch({ shopEyebrow })}
        />
      </div>
      <div style={{ marginTop: 14 }}>
        <ImageField
          label="Banner photograph"
          value={input.shopBannerImage}
          error={errors.shopBannerImage}
          altError={errors["shopBannerImage.alt"]}
          onChange={(shopBannerImage) => patch({ shopBannerImage })}
        />
      </div>
    </SectionShell>
  );
}

/* ---------- lookbook ---------- */

function Lookbook({ initial }: { initial: CopyInput["lookbook"] }) {
  const form = useSection(initial, validateLookbook, saveLookbookCopy);
  const { input, patch, errors } = form;

  return (
    <SectionShell
      title="Lookbook text"
      note="The words at the top of the lookbook. The looks themselves are on the Lookbook tab."
      state={form.state}
      pending={form.pending}
      dirty={form.dirty}
      onSave={form.submit}
    >
      <div className={s.grid}>
        <TextField
          label="Eyebrow"
          required
          value={input.lookbookEyebrow}
          error={errors.lookbookEyebrow}
          onChange={(lookbookEyebrow) => patch({ lookbookEyebrow })}
        />
        <TextArea
          label="Introduction"
          required
          wide
          value={input.lookbookIntro}
          error={errors.lookbookIntro}
          onChange={(lookbookIntro) => patch({ lookbookIntro })}
        />
      </div>
    </SectionShell>
  );
}

/* ---------- story ---------- */

function Story({ initial }: { initial: CopyInput["story"] }) {
  const form = useSection(initial, validateStory, saveStory);
  const { input, patch, errors } = form;

  function setValue(index: number, next: Partial<ValueInput>) {
    patch({
      values: input.values.map((value, at) => (at === index ? { ...value, ...next } : value)),
    });
  }

  function setStep(index: number, next: Partial<ProcessStepInput>) {
    patch({
      processSteps: input.processSteps.map((step, at) =>
        at === index ? { ...step, ...next } : step,
      ),
    });
  }

  // The schema fixes these at three and four. Rather than make the owner add rows to
  // satisfy a count, the missing ones are drawn as empty and filled in place.
  const values = pad(input.values, 3, () => ({ key: newKey(), title: "", body: "" }));
  const steps = pad(input.processSteps, 4, () => ({
    key: newKey(),
    title: "",
    body: "",
    image: null,
  }));

  return (
    <SectionShell
      title="Our story"
      note="The meaning of the name, the mission, three core values and the four steps of the process."
      state={form.state}
      pending={form.pending}
      dirty={form.dirty}
      onSave={form.submit}
    >
      <div className={s.grid}>
        <TextField
          label="What Șèdá means"
          required
          wide
          hint="A Yoruba word meaning to create."
          value={input.meaning}
          error={errors.meaning}
          onChange={(meaning) => patch({ meaning })}
        />
        <TextArea
          label="Mission"
          required
          wide
          value={input.mission}
          error={errors.mission}
          onChange={(mission) => patch({ mission })}
        />
        <TextArea
          label="Vision"
          required
          wide
          value={input.vision}
          error={errors.vision}
          onChange={(vision) => patch({ vision })}
        />
        <TextArea
          label="Closing line"
          required
          wide
          value={input.people}
          error={errors.people}
          onChange={(people) => patch({ people })}
        />
      </div>

      <div className={s.imageList} style={{ marginTop: 14 }}>
        <ImageField
          label="Story hero"
          value={input.storyHeroImage}
          altError={errors["storyHeroImage.alt"]}
          onChange={(storyHeroImage) => patch({ storyHeroImage })}
          onRemove={input.storyHeroImage ? () => patch({ storyHeroImage: null }) : undefined}
        />
        <ImageField
          label="Mission photograph"
          value={input.missionImage}
          altError={errors["missionImage.alt"]}
          onChange={(missionImage) => patch({ missionImage })}
          onRemove={input.missionImage ? () => patch({ missionImage: null }) : undefined}
        />
      </div>

      <h3 className={s.rowTitle} style={{ marginTop: 18 }}>
        Three core values
      </h3>
      {errors.values && (
        <span className={s.error} role="alert">
          {errors.values}
        </span>
      )}
      {values.map((value, index) => (
        <div key={value.key} className={s.rowCard}>
          <div className={s.grid}>
            <TextField
              label={`Value ${index + 1}`}
              required
              value={value.title}
              error={errors[`values.${index}.title`]}
              onChange={(title) => setValue(index, { title })}
            />
            <TextArea
              label="What it means"
              required
              wide
              rows={3}
              value={value.body}
              error={errors[`values.${index}.body`]}
              onChange={(body) => setValue(index, { body })}
            />
          </div>
        </div>
      ))}

      <h3 className={s.rowTitle} style={{ marginTop: 18 }}>
        The creative process
      </h3>
      {errors.processSteps && (
        <span className={s.error} role="alert">
          {errors.processSteps}
        </span>
      )}
      {steps.map((step, index) => (
        <div key={step.key} className={s.rowCard}>
          <div className={s.grid}>
            <TextField
              label={`Step ${index + 1}`}
              required
              value={step.title}
              error={errors[`processSteps.${index}.title`]}
              onChange={(title) => setStep(index, { title })}
            />
            <TextArea
              label="What happens"
              required
              wide
              rows={3}
              value={step.body}
              error={errors[`processSteps.${index}.body`]}
              onChange={(body) => setStep(index, { body })}
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <ImageField
              label="Photograph"
              value={step.image}
              altError={errors[`processSteps.${index}.image.alt`]}
              onChange={(image) => setStep(index, { image })}
              onRemove={step.image ? () => setStep(index, { image: null }) : undefined}
            />
          </div>
        </div>
      ))}
    </SectionShell>
  );
}

function pad<T>(list: T[], length: number, make: () => T): T[] {
  if (list.length >= length) return list;
  return [...list, ...Array.from({ length: length - list.length }, make)];
}

/* ---------- contact ---------- */

function Contact({ initial }: { initial: CopyInput["contact"] }) {
  const form = useSection(initial, validateContact, saveContact);
  const { input, patch, errors } = form;

  return (
    <SectionShell
      title="Contact and shipping"
      note="Shown on the contact page and in the footer. The shipping copy is the product page's Shipping tab whenever a garment does not override it."
      state={form.state}
      pending={form.pending}
      dirty={form.dirty}
      onSave={form.submit}
    >
      <div className={s.grid}>
        <TextField
          label="Email"
          required
          value={input.email}
          error={errors.email}
          onChange={(email) => patch({ email })}
        />
        <TextField
          label="Phone"
          required
          hint="Unformatted, the way the brand writes it: 08160110390."
          value={input.phone}
          error={errors.phone}
          onChange={(phone) => patch({ phone })}
        />
        <TextField
          label="Social"
          required
          value={input.social}
          error={errors.social}
          onChange={(social) => patch({ social })}
        />
        <TextField
          label="Studio"
          required
          hint="Lagos · Abuja"
          value={input.studio}
          error={errors.studio}
          onChange={(studio) => patch({ studio })}
        />
        <TextArea
          label="Site-wide shipping copy"
          required
          wide
          value={input.shippingCopy}
          error={errors.shippingCopy}
          onChange={(shippingCopy) => patch({ shippingCopy })}
        />
      </div>

      <div style={{ marginTop: 14 }}>
        <ImageField
          label="Contact photograph"
          value={input.contactImage}
          altError={errors["contactImage.alt"]}
          onChange={(contactImage) => patch({ contactImage })}
          onRemove={input.contactImage ? () => patch({ contactImage: null }) : undefined}
        />
      </div>
    </SectionShell>
  );
}
