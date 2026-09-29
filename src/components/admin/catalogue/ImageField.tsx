"use client";

import { useId, useRef, useState, useTransition } from "react";

import { downscale } from "@/lib/catalogue/downscale";
import { assetPreview } from "@/lib/catalogue/preview";
import type { ImageInput } from "@/lib/catalogue/types";

import { upload } from "@/app/admin/(shell)/catalogue/actions";
import s from "./catalogue.module.css";

/**
 * Choose a photograph, describe it, done.
 *
 * The file goes straight to a server action on selection rather than waiting for the
 * form to be submitted, so the owner sees the picture land and can judge the crop
 * before committing to anything. What the form holds afterwards is only the asset id.
 *
 * hotspot and crop are carried through untouched. Studio is where those get set, and
 * an edit made here must not quietly discard them.
 */

export function ImageField({
  label,
  hint,
  value,
  onChange,
  error,
  altError,
  onRemove,
}: {
  label: string;
  hint?: string;
  value: ImageInput | null;
  onChange: (value: ImageInput) => void;
  error?: string;
  altError?: string;
  onRemove?: () => void;
}) {
  const id = useId();
  const [pending, start] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const preview = assetPreview(value?.assetId, 240);

  function choose(file: File | undefined) {
    if (!file) return;
    setFailure(null);

    start(async () => {
      // Everything here is inside the catch on purpose. An upload that rejects —
      // a payload the platform refused, a phone that lost signal halfway — used to
      // escape the transition and take the whole document down to the offline
      // screen, losing every unsaved field on the way. It belongs in this one label.
      try {
        // Shrunk before it is sent rather than after it is refused.
        const ready = await downscale(file);

        const body = new FormData();
        body.set("file", ready);
        const result = await upload(body);

        if (!result.ok) {
          setFailure(result.message);
          // Clearing the input matters: without it, picking the same file again fires no
          // change event and the retry looks like it did nothing.
          if (input.current) input.current.value = "";
          return;
        }

        onChange({
          assetId: result.assetId,
          alt: value?.alt ?? "",
          decorative: value?.decorative ?? false,
          hotspot: value?.hotspot,
          crop: value?.crop,
        });
      } catch (error) {
        console.error("[catalogue] upload failed", error);
        setFailure("That photograph did not upload. Check the connection and try again.");
      } finally {
        if (input.current) input.current.value = "";
      }
    });
  }

  return (
    <div className={s.imageField}>
      <div className={s.rowHead}>
        <span className={s.rowTitle}>{label}</span>
        {onRemove && (
          <button type="button" className={`${s.small} ${s.danger}`} onClick={onRemove}>
            Remove
          </button>
        )}
      </div>

      {hint && <span className={s.hint}>{hint}</span>}

      <div className={s.imageRow}>
        {preview ? (
          // Not next/image: the asset id changes on every upload and these are
          // editor thumbnails, not pages anybody is measuring Core Web Vitals on.
          // eslint-disable-next-line @next/next/no-img-element
          <img className={s.thumb} src={preview} alt="" width={96} height={120} />
        ) : (
          <span className={s.empty}>{pending ? "Uploading…" : "No photograph"}</span>
        )}

        <div className={s.imageMeta}>
          <input
            ref={input}
            id={id}
            type="file"
            className={s.file}
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={pending}
            onChange={(event) => choose(event.target.files?.[0])}
          />

          <label className={s.label} htmlFor={`${id}-alt`}>
            What the photograph shows
          </label>
          <input
            id={`${id}-alt`}
            className={s.input}
            value={value?.alt ?? ""}
            placeholder="Indigo resist-dyed cargos, worn with a cream shirt"
            disabled={!value?.assetId}
            aria-invalid={altError ? true : undefined}
            onChange={(event) => value && onChange({ ...value, alt: event.target.value })}
          />
          <span className={s.hint}>
            For someone who cannot see it. Describe the garment and the cloth, not the mood.
          </span>

          <label className={s.check}>
            <input
              type="checkbox"
              checked={value?.decorative ?? false}
              disabled={!value?.assetId}
              onChange={(event) =>
                value && onChange({ ...value, decorative: event.target.checked })
              }
            />
            <span>
              Decorative only
              <span className={s.hint}>
                Tick for texture and pattern that carry no information.
              </span>
            </span>
          </label>
        </div>
      </div>

      {(error || altError || failure) && (
        <span className={s.error} role="alert">
          {failure ?? error ?? altError}
        </span>
      )}
    </div>
  );
}

/** An ordered set of photographs. First is the card and the hero, which is why the
 * order controls are here rather than left to whatever order they uploaded in. */
export function ImageList({
  label,
  hint,
  values,
  onChange,
  errorAt,
  max,
  fixed,
}: {
  label: string;
  hint?: string;
  values: ImageInput[];
  onChange: (values: ImageInput[]) => void;
  errorAt?: (index: number) => { error?: string; altError?: string };
  max?: number;
  /** A fixed-length strip: rows can be replaced and reordered but not added or removed. */
  fixed?: number;
}) {
  const list = fixed ? Array.from({ length: fixed }, (_, index) => values[index] ?? null) : values;

  function set(index: number, next: ImageInput) {
    const copy = [...values];
    copy[index] = next;
    onChange(copy);
  }

  function move(index: number, by: number) {
    const target = index + by;
    if (target < 0 || target >= values.length) return;
    const copy = [...values];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    onChange(copy);
  }

  return (
    <div className={s.field}>
      <span className={s.label}>{label}</span>
      {hint && <span className={s.hint}>{hint}</span>}

      <div className={s.imageList}>
        {list.map((image, index) => {
          const problems = errorAt?.(index) ?? {};
          return (
            <div key={image?.assetId || `slot-${index}`}>
              <ImageField
                label={fixed ? `Photograph ${index + 1}` : `${index + 1}`}
                value={image}
                error={problems.error}
                altError={problems.altError}
                onChange={(next) => set(index, next)}
                onRemove={
                  fixed ? undefined : () => onChange(values.filter((_, at) => at !== index))
                }
              />
              {!fixed && values.length > 1 && (
                <div className={s.actions} style={{ marginTop: 6 }}>
                  <button
                    type="button"
                    className={s.small}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    className={s.small}
                    disabled={index === values.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    Move down
                  </button>
                  {index === 0 && <span className={s.hint}>Shown on the shop card</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!fixed && (max === undefined || values.length < max) && (
        <div className={s.actions}>
          <button
            type="button"
            className={s.small}
            onClick={() => onChange([...values, { assetId: "", alt: "", decorative: false }])}
          >
            Add a photograph
          </button>
        </div>
      )}
    </div>
  );
}
