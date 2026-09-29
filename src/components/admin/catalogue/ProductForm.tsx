"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { blankColourway } from "@/lib/catalogue/blank";
import { slugify } from "@/lib/catalogue/keys";
import { SIZES } from "@/lib/catalogue/sizes";
import type { ColourwayInput, EditorState, ProductInput } from "@/lib/catalogue/types";
import { summarise, validateProduct } from "@/lib/catalogue/validate";
import { formatNaira } from "@/lib/money";
import { absoluteUrl } from "@/lib/site";

import { saveProduct } from "@/app/admin/(shell)/catalogue/actions";
import s from "./catalogue.module.css";
import {
  HexField,
  CheckList,
  NumberField,
  PriceField,
  SelectField,
  TextArea,
  TextField,
  Toggle,
} from "./Fields";
import { ImageList } from "./ImageField";

/**
 * The product editor. Everything the Studio form does, in the admin's own session.
 *
 * Validation runs on every change so that the error under a field disappears the
 * moment it is fixed, but the messages only appear once somebody has tried to save —
 * a form that scolds you about an empty field you have not reached yet is worse than
 * one that waits.
 */

export function ProductForm({
  id,
  rev,
  initial,
  categories,
  others,
}: {
  id: string | null;
  rev: string | null;
  initial: ProductInput;
  categories: { value: string; label: string }[];
  others: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [input, setInput] = useState(initial);
  const [state, setState] = useState<EditorState>({ status: "idle" });
  const [showErrors, setShowErrors] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  // The slug follows the name until somebody edits it directly. After that it is
  // theirs — renaming a live product must not silently move its web address.
  const [slugLocked, setSlugLocked] = useState(Boolean(initial.slug));

  const live = validateProduct(input);
  const serverErrors = state.status === "error" ? state.errors : {};
  const errors = showErrors ? { ...live, ...serverErrors } : serverErrors;

  function patch(next: Partial<ProductInput>) {
    setInput((was) => ({ ...was, ...next }));
    setDirty(true);
    if (state.status === "saved") setState({ status: "idle" });
  }

  function patchColourway(index: number, next: Partial<ColourwayInput>) {
    patch({
      colourways: input.colourways.map((colour, at) =>
        at === index ? { ...colour, ...next } : colour,
      ),
    });
  }

  function submit() {
    setShowErrors(true);
    if (Object.keys(live).length > 0) {
      setState({ status: "error", message: summarise(live), errors: live });
      return;
    }

    start(async () => {
      const result = await saveProduct(id, rev, input);
      setState(result);

      if (result.status === "saved") {
        setDirty(false);
        setShowErrors(false);
        // A new product has no route of its own until it exists. Replacing rather than
        // pushing means Back goes to the list, not to an empty create form. The flag
        // carries the confirmation across, because this component is unmounted by the
        // navigation and its "saved" message would go with it.
        if (!id && result.id) {
          router.replace(`/admin/catalogue/products/${result.id}?created=1`);
        } else router.refresh();
      }
    });
  }

  return (
    <div>
      <section className={s.card}>
        <div className={s.cardHead}>
          <h2 className={s.cardTitle}>The garment</h2>
          {/* Absolute, and only once the garment exists.
              Relative would resolve against admin.pieceofseda.com, where the
              middleware turns /product/x into /admin/product/x and nothing answers.
              The id gate matters too: the slug fills in as soon as a name is typed,
              so on the create form this used to offer a link to a page that had not
              been written yet. */}
          {id && input.slug && (
            <Link
              className={s.ghost}
              href={absoluteUrl(`/product/${input.slug}`)}
              target="_blank"
              rel="noreferrer"
            >
              View on the shop ↗
            </Link>
          )}
        </div>

        <div className={s.grid}>
          <TextField
            label="Name"
            required
            hint="The garment, not the colour. The Dart Cargos."
            value={input.name}
            error={errors.name}
            onChange={(name) => patch(slugLocked ? { name } : { name, slug: slugify(name) })}
          />

          <TextField
            label="Web address"
            required
            hint={`pieceofseda.com/product/${input.slug || "…"}`}
            value={input.slug}
            error={errors.slug}
            onChange={(slug) => {
              setSlugLocked(true);
              patch({ slug: slugify(slug) });
            }}
          />

          <SelectField
            label="Category"
            required
            placeholder="Choose one"
            hint="What the shop filters on."
            value={input.categoryId}
            options={categories}
            error={errors.categoryId}
            onChange={(categoryId) => patch({ categoryId })}
          />

          <PriceField
            label="Price in naira"
            required
            hint={
              Number.isFinite(input.priceKobo)
                ? `Stored as ${input.priceKobo.toLocaleString("en-NG")} kobo — ${formatNaira(input.priceKobo)}`
                : "Whole naira. Stored in kobo so payment totals are exact."
            }
            kobo={input.priceKobo}
            error={errors.priceKobo}
            onChange={(priceKobo) => patch({ priceKobo })}
          />

          <NumberField
            label="Sort order"
            hint="Lower sorts first. The home page shows the first three."
            value={input.order}
            error={errors.order}
            onChange={(order) => patch({ order })}
          />

          <div className={s.field}>
            <Toggle
              label="Visible in the shop"
              hint="Untick to pull it without deleting it or its order history."
              checked={input.active}
              onChange={(active) => patch({ active })}
            />
          </div>
        </div>
      </section>

      <section className={s.card}>
        <div className={s.cardHead}>
          <h2 className={s.cardTitle}>Colourways</h2>
          <button
            type="button"
            className={s.small}
            onClick={() => patch({ colourways: [...input.colourways, blankColourway()] })}
          >
            Add a colourway
          </button>
        </div>
        <p className={s.cardNote}>
          The shop grid renders a card for each one, so six garments in three colours is eighteen
          cards. Stock is counted per size, per colour.
        </p>

        {errors.colourways && (
          <p className={`${s.status} ${s.bad}`} role="alert">
            {errors.colourways}
          </p>
        )}

        {input.colourways.map((colour, index) => (
          <div key={colour.key} className={s.rowCard}>
            <div className={s.rowHead}>
              <p className={s.rowTitle}>
                <span className={s.dot} style={{ background: colour.swatch }} aria-hidden="true" />
                {colour.name || `Colourway ${index + 1}`}
              </p>
              {input.colourways.length > 1 && (
                <button
                  type="button"
                  className={`${s.small} ${s.danger}`}
                  onClick={() =>
                    patch({ colourways: input.colourways.filter((_, at) => at !== index) })
                  }
                >
                  Remove
                </button>
              )}
            </div>

            <div className={s.grid}>
              <TextField
                label="Colour name"
                required
                value={colour.name}
                error={errors[`colourways.${index}.name`]}
                onChange={(name) =>
                  patchColourway(index, {
                    name,
                    slug: colour.slug ? colour.slug : slugify(name),
                  })
                }
              />
              <TextField
                label="Colour address"
                required
                hint="Preselects this colour in the product URL."
                value={colour.slug}
                error={errors[`colourways.${index}.slug`]}
                onChange={(slug) => patchColourway(index, { slug: slugify(slug) })}
              />
              <HexField
                label="Swatch"
                required
                hint="The 26px square in the colour row."
                value={colour.swatch}
                error={errors[`colourways.${index}.swatch`]}
                onChange={(swatch) => patchColourway(index, { swatch })}
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <ImageList
                label="Photographs"
                hint="The first is the shop card and the product hero."
                values={colour.images}
                errorAt={(at) => ({
                  error: errors[`colourways.${index}.images.${at}`],
                  altError: errors[`colourways.${index}.images.${at}.alt`],
                })}
                onChange={(images) => patchColourway(index, { images })}
              />
              {errors[`colourways.${index}.images`] && (
                <span className={s.error} role="alert">
                  {errors[`colourways.${index}.images`]}
                </span>
              )}
            </div>

            <div style={{ marginTop: 14 }}>
              <span className={s.label}>Units in stock</span>
              <span className={s.hint}>
                Real counts. The product page says &ldquo;Only 4 left&rdquo; and has to be telling
                the truth.
              </span>
              <div className={s.stock} style={{ marginTop: 6 }}>
                {SIZES.map((size) => {
                  const row = colour.stock.find((entry) => entry.size === size);
                  const quantity = row?.quantity ?? 0;
                  return (
                    <div key={size} className={s.stockCell}>
                      <label className={s.stockLabel} htmlFor={`${colour.key}-${size}`}>
                        {size}
                      </label>
                      <input
                        id={`${colour.key}-${size}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        className={s.stockInput}
                        data-out={quantity === 0 || undefined}
                        value={quantity}
                        onChange={(event) =>
                          patchColourway(index, {
                            stock: SIZES.map((each) => ({
                              size: each,
                              quantity:
                                each === size
                                  ? Math.max(0, Number(event.target.value) || 0)
                                  : (colour.stock.find((entry) => entry.size === each)?.quantity ??
                                    0),
                            })),
                          })
                        }
                      />
                    </div>
                  );
                })}
              </div>
              {errors[`colourways.${index}.stock`] && (
                <span className={s.error} role="alert">
                  {errors[`colourways.${index}.stock`]}
                </span>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className={s.card}>
        <h2 className={s.cardTitle}>Words</h2>
        <div className={s.grid}>
          <TextArea
            label="Rationale"
            required
            wide
            hint="The paragraph beside the price. Describe the process, do not claim it."
            value={input.description}
            error={errors.description}
            onChange={(description) => patch({ description })}
          />
          <TextArea
            label="Details tab"
            required
            value={input.details}
            error={errors.details}
            onChange={(details) => patch({ details })}
          />
          <TextArea
            label="Care tab"
            required
            value={input.care}
            error={errors.care}
            onChange={(care) => patch({ care })}
          />
          <TextArea
            label="Shipping tab"
            hint="Leave empty to use the site-wide shipping copy."
            value={input.shipping}
            onChange={(shipping) => patch({ shipping })}
          />
          <TextArea
            label="Research insight"
            hint="The oxblood band below the product. Empty hides the band."
            value={input.research}
            onChange={(research) => patch({ research })}
          />
        </div>
      </section>

      {others.length > 0 && (
        <section className={s.card}>
          <h2 className={s.cardTitle}>Pairs with</h2>
          <p className={s.cardNote}>
            Shown four-up beneath the product. Choose none and the newest pieces are used instead.
          </p>
          <CheckList
            label={`${input.pairsWith.length} of 4 chosen`}
            values={input.pairsWith}
            options={others}
            max={4}
            error={errors.pairsWith}
            onChange={(pairsWith) => patch({ pairsWith })}
          />
        </section>
      )}

      <div className={s.saveBar} data-dirty={dirty || undefined}>
        <button type="button" className={s.primary} disabled={pending} onClick={submit}>
          {pending ? "Saving…" : id ? "Save changes" : "Create the product"}
        </button>

        <Link className={s.ghost} href="/admin/catalogue">
          Back to the catalogue
        </Link>

        {state.status !== "idle" ? (
          <p
            className={`${s.status} ${state.status === "error" ? s.bad : s.good}`}
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </p>
        ) : (
          dirty && <span className={s.dirty}>Unsaved changes</span>
        )}
      </div>
    </div>
  );
}
