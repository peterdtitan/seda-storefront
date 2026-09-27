"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { slugify } from "@/lib/catalogue/keys";
import type { CategoryRow } from "@/lib/catalogue/read";
import type { CategoryInput, EditorState } from "@/lib/catalogue/types";
import { summarise, validateCategory } from "@/lib/catalogue/validate";

import { removeCategory, saveCategory } from "@/app/admin/(shell)/catalogue/actions";
import s from "./catalogue.module.css";
import { NumberField, TextField } from "./Fields";

/**
 * Categories are three fields each, so they are edited in place rather than on a page
 * of their own. The filter row on the shop is short and reordering it is the thing
 * that actually gets done here.
 */

export function CategoriesEditor({ rows }: { rows: CategoryRow[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const nextOrder = rows.reduce((highest, row) => Math.max(highest, row.order), -1) + 1;

  return (
    <>
      <section className={s.card}>
        <div className={s.cardHead}>
          <h2 className={s.cardTitle}>
            {rows.length} {rows.length === 1 ? "category" : "categories"}
          </h2>
          <button type="button" className={s.small} onClick={() => setAdding((was) => !was)}>
            {adding ? "Cancel" : "Add a category"}
          </button>
        </div>
        <p className={s.cardNote}>
          These are the pills above the shop grid. A product must have one, so a category with
          products in it cannot be deleted until they are moved.
        </p>

        {adding && (
          <CategoryRowForm
            key="new"
            id={null}
            rev={null}
            initial={{ title: "", slug: "", order: nextOrder }}
            products={0}
            onDone={() => {
              setAdding(false);
              router.refresh();
            }}
          />
        )}

        {rows.map((row) => (
          <CategoryRowForm
            key={row.id}
            id={row.id}
            rev={row.rev}
            initial={{ title: row.title, slug: row.slug, order: row.order }}
            products={row.products}
            onDone={() => router.refresh()}
          />
        ))}
      </section>
    </>
  );
}

function CategoryRowForm({
  id,
  rev,
  initial,
  products,
  onDone,
}: {
  id: string | null;
  rev: string | null;
  initial: CategoryInput;
  products: number;
  onDone: () => void;
}) {
  const [input, setInput] = useState(initial);
  const [state, setState] = useState<EditorState>({ status: "idle" });
  const [showErrors, setShowErrors] = useState(false);
  const [pending, start] = useTransition();
  const [slugLocked, setSlugLocked] = useState(Boolean(initial.slug));

  const live = validateCategory(input);
  const errors = {
    ...(showErrors ? live : {}),
    ...(state.status === "error" ? state.errors : {}),
  };
  const dirty =
    input.title !== initial.title || input.slug !== initial.slug || input.order !== initial.order;

  function submit() {
    setShowErrors(true);
    if (Object.keys(live).length > 0) {
      setState({ status: "error", message: summarise(live), errors: live });
      return;
    }
    start(async () => {
      const result = await saveCategory(id, rev, input);
      setState(result);
      if (result.status === "saved") {
        setShowErrors(false);
        onDone();
      }
    });
  }

  return (
    <div className={s.rowCard}>
      <div className={s.grid}>
        <TextField
          label="Name"
          required
          value={input.title}
          error={errors.title}
          onChange={(title) =>
            setInput((was) => ({ ...was, title, slug: slugLocked ? was.slug : slugify(title) }))
          }
        />
        <TextField
          label="Web address"
          required
          value={input.slug}
          error={errors.slug}
          onChange={(slug) => {
            setSlugLocked(true);
            setInput((was) => ({ ...was, slug: slugify(slug) }));
          }}
        />
        <NumberField
          label="Position"
          hint="Lower sits further left."
          value={input.order}
          error={errors.order}
          onChange={(order) => setInput((was) => ({ ...was, order }))}
        />
      </div>

      <div className={s.actions} style={{ marginTop: 12 }}>
        <button
          type="button"
          className={s.small}
          disabled={pending || (!dirty && Boolean(id))}
          onClick={submit}
        >
          {pending ? "Saving…" : id ? "Save" : "Add"}
        </button>

        {id && (
          <button
            type="button"
            className={`${s.small} ${s.danger}`}
            disabled={pending || products > 0}
            title={products > 0 ? "Move its products to another category first" : undefined}
            onClick={() =>
              start(async () => {
                const result = await removeCategory(id);
                setState(result);
                if (result.status === "saved") onDone();
              })
            }
          >
            Delete
          </button>
        )}

        <span className={s.itemMeta}>
          {products} {products === 1 ? "product" : "products"}
        </span>

        {state.status !== "idle" && (
          <span
            className={state.status === "error" ? s.bad : s.good}
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </span>
        )}
      </div>
    </div>
  );
}
