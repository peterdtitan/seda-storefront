"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { runReconciliation, type ReconcileState } from "./actions";
import s from "./payments.module.css";

function Button({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={s.check} disabled={pending}>
      {pending ? "Asking Paystack…" : label}
    </button>
  );
}

export function Reconcile({ pendingCount }: { pendingCount: number }) {
  const [state, action] = useActionState<ReconcileState, FormData>(() => runReconciliation(), {
    status: "idle",
  });

  return (
    <form action={action} className={s.reconcile}>
      <div>
        <h2 className={s.cardTitle}>Check against Paystack</h2>
        <p className={s.quiet}>
          {pendingCount === 0
            ? "Nothing is sitting unresolved. Running this will find nothing, which is the right answer."
            : `${pendingCount} ${pendingCount === 1 ? "order has" : "orders have"} been pending for over half an hour. Usually that is someone who changed their mind — occasionally it is a webhook that never arrived, which means the money was taken and nothing was fulfilled.`}
        </p>
      </div>

      <Button label="Check now" />

      {state.status === "error" && (
        <p className={s.bad} role="alert">
          {state.message}
        </p>
      )}

      {state.status === "done" && (
        <div className={s.result} role="status">
          <p className={s.resultHead}>
            Checked {state.checked} {state.checked === 1 ? "order" : "orders"}.
            {state.findings.some((f) => f.action === "recovered") &&
              " Some had been paid all along."}
          </p>

          {state.findings.length > 0 && (
            <ul className={s.findings}>
              {state.findings.map((finding) => (
                <li key={finding.reference} className={s.finding} data-action={finding.action}>
                  <span className={s.findingRef}>{finding.reference}</span>
                  <span className={s.findingWhat}>
                    ours <strong>{finding.ours}</strong> · Paystack{" "}
                    <strong>{finding.theirs}</strong>
                  </span>
                  <span className={s.findingNote}>{finding.note}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
