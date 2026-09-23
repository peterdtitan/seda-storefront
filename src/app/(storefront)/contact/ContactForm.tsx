"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Cta } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Text";

import { submitContactRequest, type ContactState } from "./actions";
import s from "./contact.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Cta type="submit" disabled={pending}>
      {pending ? "Sending…" : "Send message"}
    </Cta>
  );
}

export function ContactForm() {
  const [state, action] = useActionState<ContactState, FormData>(submitContactRequest, {
    status: "idle",
  });

  const fields = state.status === "error" ? (state.fields ?? {}) : {};

  return (
    <div className={s.form}>
      <Eyebrow as="h2">Custom requests</Eyebrow>

      <form action={action} className={s.fields}>
        <label className="seda-visually-hidden" htmlFor="contact-name">
          Your name
        </label>
        <input
          id="contact-name"
          className={s.input}
          name="name"
          placeholder="Your name"
          autoComplete="name"
          defaultValue={fields.name ?? ""}
          maxLength={120}
          required
        />

        <label className="seda-visually-hidden" htmlFor="contact-email">
          Your email address
        </label>
        <input
          id="contact-email"
          className={s.input}
          name="email"
          type="email"
          placeholder="your@email.com"
          autoComplete="email"
          defaultValue={fields.email ?? ""}
          maxLength={254}
          required
        />

        <label className="seda-visually-hidden" htmlFor="contact-message">
          What should we know?
        </label>
        <textarea
          id="contact-message"
          className={s.textarea}
          name="message"
          placeholder="Anything we should know about the fit?"
          defaultValue={fields.message ?? ""}
          maxLength={4000}
          required
        />

        <div className={s.honeypot} aria-hidden="true">
          <label htmlFor="contact-company">Company</label>
          <input id="contact-company" name="company" tabIndex={-1} autoComplete="off" />
        </div>

        <SubmitButton />
      </form>

      {state.status === "sent" && (
        <p className={`${s.feedback} ${s.sent}`} role="status">
          Thank you. We read every message and will reply to you directly.
        </p>
      )}

      {state.status === "error" && (
        <p className={s.feedback} role="alert">
          {state.message}
        </p>
      )}
    </div>
  );
}
