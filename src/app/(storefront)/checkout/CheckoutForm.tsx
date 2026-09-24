"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Cta } from "@/components/ui/Button";

import { startCheckout, type CheckoutState } from "./actions";
import s from "./checkout.module.css";

function Submit({ total }: { total: string }) {
  const { pending } = useFormStatus();
  return (
    <Cta full type="submit" disabled={pending} className={s.pay}>
      {pending ? "Taking you to Paystack…" : `Pay ${total}`}
    </Cta>
  );
}

const FIELDS = [
  { name: "name", label: "Full name", autoComplete: "name", required: true },
  { name: "email", label: "Email address", type: "email", autoComplete: "email", required: true },
  { name: "phone", label: "Phone number", type: "tel", autoComplete: "tel", required: false },
  {
    name: "address",
    label: "Delivery address",
    autoComplete: "street-address",
    required: true,
  },
  { name: "city", label: "City", autoComplete: "address-level2", required: true },
  { name: "state", label: "State", autoComplete: "address-level1", required: false },
] as const;

export function CheckoutForm({ total }: { total: string }) {
  const [state, action] = useActionState<CheckoutState, FormData>(startCheckout, {
    status: "idle",
  });

  return (
    <form action={action} className={s.form}>
      {FIELDS.map((f) => (
        <div key={f.name} className={s.field}>
          <label htmlFor={`checkout-${f.name}`} className={s.label}>
            {f.label}
            {!f.required && <span className={s.optional}> (optional)</span>}
          </label>
          <input
            id={`checkout-${f.name}`}
            name={f.name}
            type={"type" in f ? f.type : "text"}
            autoComplete={f.autoComplete}
            required={f.required}
            className={s.input}
          />
        </div>
      ))}

      {state.status === "error" && (
        <p className={s.error} role="alert">
          {state.message}
        </p>
      )}

      <Submit total={total} />

      <p className={s.note}>
        You will be taken to Paystack to pay. Card, bank transfer and USSD are accepted.
      </p>
    </form>
  );
}
