"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { ROLE_BLURB, ROLES } from "@/lib/admin/roles";

import { invite, type StaffState } from "./actions";
import s from "./staff.module.css";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={s.submit} disabled={pending}>
      {pending ? "Adding…" : "Add them"}
    </button>
  );
}

export function InviteForm() {
  const [state, action] = useActionState<StaffState, FormData>(invite, { status: "idle" });

  return (
    <form action={action} className={s.invite}>
      <div className={s.inviteFields}>
        <div className={s.field}>
          <label htmlFor="invite-email" className={s.label}>
            Email
          </label>
          <input id="invite-email" name="email" type="email" required className={s.input} />
        </div>
        <div className={s.field}>
          <label htmlFor="invite-name" className={s.label}>
            Name (optional)
          </label>
          <input id="invite-name" name="name" type="text" className={s.input} />
        </div>
      </div>

      <fieldset className={s.fieldset}>
        <legend className={s.legend}>What they can reach</legend>
        {ROLES.map((role) => (
          <label key={role} className={s.check}>
            <input type="checkbox" name="roles" value={role} />
            <span>
              <strong>{role}</strong>
              <span className={s.blurb}>{ROLE_BLURB[role]}</span>
            </span>
          </label>
        ))}
      </fieldset>

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
