"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { assetPreview } from "@/lib/catalogue/preview";
import type { ProductRow } from "@/lib/catalogue/read";
import { formatNaira } from "@/lib/money";

import {
  checkProductDelete,
  removeProduct,
  toggleProduct,
} from "@/app/admin/(shell)/catalogue/actions";
import s from "./catalogue.module.css";

/**
 * The catalogue list.
 *
 * Hiding is the everyday action and sits on every row. Deleting is behind a check that
 * names what would break, because the owner cannot be expected to remember that the
 * home page's design study points at one of these.
 */

type Blocking = { id: string; label: string };

export function ProductList({ rows }: { rows: ProductRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [check, setCheck] = useState<{ blockedBy: Blocking[]; unitsSold: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <p className={s.emptyState}>
        Nothing in the catalogue yet.
        <br />
        Add the first garment and it appears in the shop as soon as you tick it visible.
      </p>
    );
  }

  function toggle(row: ProductRow) {
    setBusy(row.id);
    setMessage(null);
    start(async () => {
      const result = await toggleProduct(row.id, row.slug, !row.active);
      if (result.status !== "idle") setMessage(result.message);
      setBusy(null);
      router.refresh();
    });
  }

  function askToDelete(row: ProductRow) {
    setConfirming(row.id);
    setCheck(null);
    setMessage(null);
    start(async () => setCheck(await checkProductDelete(row.id, row.slug)));
  }

  function confirmDelete(row: ProductRow) {
    setBusy(row.id);
    start(async () => {
      const result = await removeProduct(row.id, row.slug);
      if (result.status !== "idle") setMessage(result.message);
      setBusy(null);
      setConfirming(null);
      router.refresh();
    });
  }

  return (
    <>
      {message && (
        <p className={`${s.status} ${s.good}`} role="status" style={{ marginBottom: 12 }}>
          {message}
        </p>
      )}

      <ul className={s.list}>
        {rows.map((row) => {
          const thumb = assetPreview(row.assetId, 112);
          const tone = row.units === 0 ? "out" : row.units <= 5 ? "low" : undefined;

          return (
            <li key={row.id} className={s.item} data-active={row.active}>
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={s.itemThumb} src={thumb} alt="" width={56} height={70} />
              ) : (
                <span className={s.itemThumb} />
              )}

              <div className={s.itemBody}>
                <Link className={s.itemName} href={`/admin/catalogue/products/${row.id}`}>
                  {row.name}
                </Link>
                <span className={s.itemMeta}>
                  {[
                    row.category ?? "No category",
                    formatNaira(row.priceKobo),
                    `${row.colours} ${row.colours === 1 ? "colour" : "colours"}`,
                  ].join(" · ")}
                </span>
              </div>

              <div className={s.itemActions}>
                <span className={s.pill} data-tone={tone}>
                  {row.units === 0 ? "Sold out" : `${row.units} in stock`}
                </span>
                {!row.active && <span className={s.pill}>Hidden</span>}

                <button
                  type="button"
                  className={s.small}
                  disabled={pending && busy === row.id}
                  onClick={() => toggle(row)}
                >
                  {row.active ? "Hide" : "Show"}
                </button>

                <button
                  type="button"
                  className={`${s.small} ${s.danger}`}
                  onClick={() => askToDelete(row)}
                >
                  Delete
                </button>
              </div>

              {confirming === row.id && (
                <div className={s.confirm} style={{ gridColumn: "1 / -1" }}>
                  <p className={s.confirmTitle}>Delete {row.name}?</p>

                  {!check ? (
                    <p className={s.cardNote}>Checking what points at it…</p>
                  ) : check.blockedBy.length > 0 ? (
                    <p className={s.cardNote}>
                      It cannot be deleted while these still point at it:{" "}
                      {check.blockedBy.map((entry) => entry.label).join(", ")}. Remove those links
                      first, or hide the garment instead.
                    </p>
                  ) : (
                    <p className={s.cardNote}>
                      {check.unitsSold > 0
                        ? `${check.unitsSold} ${check.unitsSold === 1 ? "unit has" : "units have"} sold. Past orders keep their own copy of the name and price, so the history stays readable — but the piece disappears from the shop and its photographs go with it. Hiding keeps both.`
                        : "Nothing has sold and nothing points at it. This removes the garment and its photographs for good."}
                    </p>
                  )}

                  <div className={s.actions}>
                    <button
                      type="button"
                      className={`${s.small} ${s.danger}`}
                      disabled={!check || check.blockedBy.length > 0 || busy === row.id}
                      onClick={() => confirmDelete(row)}
                    >
                      {busy === row.id ? "Deleting…" : "Delete for good"}
                    </button>
                    <button type="button" className={s.small} onClick={() => setConfirming(null)}>
                      Keep it
                    </button>
                    {check && check.blockedBy.length === 0 && (
                      <button type="button" className={s.small} onClick={() => toggle(row)}>
                        Hide instead
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
