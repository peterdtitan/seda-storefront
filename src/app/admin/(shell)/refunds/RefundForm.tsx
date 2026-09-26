"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { submitRefund, type RefundState } from "./actions";
import s from "./refunds.module.css";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={s.submit} disabled={pending}>
      {pending ? "Asking Paystack…" : "Refund"}
    </button>
  );
}

export function RefundForm({
  reference,
  refundableKobo,
}: {
  reference: string;
  refundableKobo: number;
}) {
  const [state, action] = useActionState<RefundState, FormData>(submitRefund, { status: "idle" });
  const maxNaira = refundableKobo / 100;

  if (refundableKobo <= 0) {
    return <p className={s.quiet}>Nothing left to refund on this order.</p>;
  }

  return (
    <form action={action} className={s.form}>
      <input type="hidden" name="reference" value={reference} />

      <div className={s.field}>
        <label htmlFor="refund-amount" className={s.label}>
          Amount in naira — up to {maxNaira.toLocaleString("en-NG")}
        </label>
        <input
          id="refund-amount"
          name="amount"
          type="number"
          min="1"
          max={maxNaira}
          step="1"
          defaultValue={maxNaira}
          required
          className={s.input}
        />
      </div>

      <div className={s.field}>
        <label htmlFor="refund-reason" className={s.label}>
          Reason — the customer may see this
        </label>
        <input
          id="refund-reason"
          name="reason"
          type="text"
          minLength={3}
          maxLength={200}
          required
          placeholder="Wrong size sent, returned unworn"
          className={s.input}
        />
      </div>

      <Submit />

      {state.status !== "idle" && (
        <p
          className={state.status === "error" ? s.bad : s.good}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
