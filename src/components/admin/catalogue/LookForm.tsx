"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { EditorState, LookInput } from "@/lib/catalogue/types";
import { summarise, validateLook } from "@/lib/catalogue/validate";

import { removeLook, saveLook } from "@/app/admin/(shell)/catalogue/actions";
import s from "./catalogue.module.css";
import { CheckList, NumberField, TextField, Toggle } from "./Fields";
import { ImageField, ImageList } from "./ImageField";

export function LookForm({
  id,
  rev,
  initial,
  products,
}: {
  id: string | null;
  rev: string | null;
  initial: LookInput;
  products: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [input, setInput] = useState(initial);
  const [state, setState] = useState<EditorState>({ status: "idle" });
  const [showErrors, setShowErrors] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  const live = validateLook(input);
  const errors = {
    ...(showErrors ? live : {}),
    ...(state.status === "error" ? state.errors : {}),
  };

  function patch(next: Partial<LookInput>) {
    setInput((was) => ({ ...was, ...next }));
    if (state.status === "saved") setState({ status: "idle" });
  }

  function submit() {
    setShowErrors(true);
    if (Object.keys(live).length > 0) {
      setState({ status: "error", message: summarise(live), errors: live });
      return;
    }

    start(async () => {
      const result = await saveLook(id, rev, input);
      setState(result);
      if (result.status === "saved") {
        setShowErrors(false);
        if (!id && result.id) router.replace(`/admin/catalogue/looks/${result.id}?created=1`);
        else router.refresh();
      }
    });
  }

  return (
    <div>
      <section className={s.card}>
        <h2 className={s.cardTitle}>The look</h2>

        <div className={s.grid}>
          <NumberField
            label="Look number"
            required
            min={1}
            hint="The caption reads Look 01, Look 02 and so on."
            value={input.order}
            error={errors.order}
            onChange={(order) => patch({ order })}
          />
          <TextField
            label="Caption"
            hint='Optional. "Resist Set" gives "Look 01 — Resist Set".'
            value={input.title}
            onChange={(title) => patch({ title })}
          />
          <div className={s.field}>
            <Toggle
              label="Feature look"
              hint="Renders large at the top. Ticking this unticks whichever look holds it now."
              checked={input.feature}
              onChange={(feature) => patch({ feature })}
            />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <ImageField
            label="The photograph"
            value={input.image}
            error={errors.image}
            altError={errors["image.alt"]}
            onChange={(image) => patch({ image })}
          />
        </div>

        {input.feature && (
          <div style={{ marginTop: 14 }}>
            <ImageList
              label="Supporting photographs"
              hint="Only shown beside the feature look. Two at most — the design stacks them."
              values={input.supportingImages}
              max={2}
              errorAt={(at) => ({
                error: errors[`supportingImages.${at}`],
                altError: errors[`supportingImages.${at}.alt`],
              })}
              onChange={(supportingImages) => patch({ supportingImages })}
            />
          </div>
        )}
      </section>

      {products.length > 0 && (
        <section className={s.card}>
          <h2 className={s.cardTitle}>Pieces in this look</h2>
          <p className={s.cardNote}>
            Links the look to the garments it shows, so somebody admiring it has a way to the bag.
          </p>
          <CheckList
            label={`${input.products.length} chosen`}
            values={input.products}
            options={products}
            error={errors.products}
            onChange={(chosen) => patch({ products: chosen })}
          />
        </section>
      )}

      <div className={s.saveBar}>
        <button type="button" className={s.primary} disabled={pending} onClick={submit}>
          {pending ? "Saving…" : id ? "Save the look" : "Add the look"}
        </button>

        <Link className={s.ghost} href="/admin/catalogue/looks">
          Back to the lookbook
        </Link>

        {id && (
          <button
            type="button"
            className={`${s.small} ${s.danger}`}
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        )}

        {state.status !== "idle" && (
          <p
            className={`${s.status} ${state.status === "error" ? s.bad : s.good}`}
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </p>
        )}
      </div>

      {confirming && id && (
        <div className={s.confirm}>
          <p className={s.confirmTitle}>Delete this look?</p>
          <p className={s.cardNote}>
            The photographs go with it. The garments it links to are untouched.
          </p>
          <div className={s.actions}>
            <button
              type="button"
              className={`${s.small} ${s.danger}`}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const result = await removeLook(id);
                  if (result.status === "saved") router.push("/admin/catalogue/looks");
                  else setState(result);
                })
              }
            >
              {pending ? "Deleting…" : "Delete for good"}
            </button>
            <button type="button" className={s.small} onClick={() => setConfirming(false)}>
              Keep it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
