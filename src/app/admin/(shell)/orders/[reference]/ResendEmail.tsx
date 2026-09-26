"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { resendEmail, type MoveState } from "./actions";
import s from "./detail.module.css";

function Button() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={s.retry} disabled={pending}>
      {pending ? "Sending…" : "Try again"}
    </button>
  );
}

export function ResendEmail({ reference, kind }: { reference: string; kind: string }) {
  const [state, action] = useActionState<MoveState, FormData>(resendEmail, { status: "idle" });

  return (
    <form action={action} className={s.retryForm}>
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="kind" value={kind} />
      <Button />
      {state.status !== "idle" && (
        <span className={state.status === "error" ? s.moveError : s.moveDone} role="status">
          {state.message}
        </span>
      )}
    </form>
  );
}
