"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { FULFILMENT_LABEL, type FulfilmentStatus } from "@/lib/admin/orderStatus";

import { changeFulfilment, type MoveState } from "./actions";
import s from "./detail.module.css";

function Move({ to, label }: { to: FulfilmentStatus; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="to"
      value={to}
      className={s.move}
      data-to={to}
      disabled={pending}
      aria-label={`${label} — ${FULFILMENT_LABEL[to]}`}
    >
      {label}
    </button>
  );
}

export function FulfilmentControls({
  reference,
  options,
  disabledReason,
}: {
  reference: string;
  options: { to: FulfilmentStatus; label: string }[];
  disabledReason?: string;
}) {
  const [state, action] = useActionState<MoveState, FormData>(changeFulfilment, {
    status: "idle",
  });

  if (disabledReason) {
    return <p className={s.quiet}>{disabledReason}</p>;
  }

  return (
    <form action={action} className={s.moves}>
      <input type="hidden" name="reference" value={reference} />

      <div className={s.moveRow}>
        {options.map((option) => (
          <Move key={option.to} to={option.to} label={option.label} />
        ))}
      </div>

      <label htmlFor="fulfil-note" className={s.noteLabel}>
        Note (optional) — goes on the record, not to the customer
      </label>
      <input
        id="fulfil-note"
        name="note"
        type="text"
        maxLength={200}
        className={s.noteInput}
        placeholder="Courier, waybill, anything worth remembering"
      />

      {state.status !== "idle" && (
        <p
          className={state.status === "error" ? s.moveError : s.moveDone}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
