"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { requestLink, type SignInState } from "./actions";
import s from "./signin.module.css";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={s.submit} disabled={pending}>
      {pending ? "Sending…" : "Email me a link"}
    </button>
  );
}

export function SignInForm() {
  const [state, action] = useActionState<SignInState, FormData>(requestLink, { status: "idle" });

  return (
    <form action={action}>
      <label htmlFor="admin-email" className={s.label}>
        Work email
      </label>
      <input
        id="admin-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        autoFocus
        className={s.input}
      />

      {state.status === "error" && (
        <p className={s.error} role="alert">
          {state.message}
        </p>
      )}

      <Submit />
    </form>
  );
}
