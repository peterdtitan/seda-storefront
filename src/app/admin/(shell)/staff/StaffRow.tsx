"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { ROLE_BLURB, ROLES, type StaffRow as Row } from "@/lib/admin/roles";
import type { Role } from "@/lib/auth/store";

import { signOutEverywhere, toggleStatus, updateRoles, type StaffState } from "./actions";
import s from "./staff.module.css";

function Pending({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={s.small} disabled={pending}>
      {pending ? busy : label}
    </button>
  );
}

export function StaffCard({ person, isYou }: { person: Row; isYou: boolean }) {
  const [open, setOpen] = useState(false);
  const [roleState, saveRoles] = useActionState<StaffState, FormData>(updateRoles, {
    status: "idle",
  });
  const [statusState, changeStatus] = useActionState<StaffState, FormData>(toggleStatus, {
    status: "idle",
  });
  const [sessionState, endSessions] = useActionState<StaffState, FormData>(signOutEverywhere, {
    status: "idle",
  });

  // Three forms, one place to say what happened. Whichever last reported something
  // wins, which is the one the person just pressed.
  const message = [roleState, statusState, sessionState].find(
    (state): state is Exclude<StaffState, { status: "idle" }> => state.status !== "idle",
  );

  return (
    <li className={s.person} data-status={person.status}>
      <div className={s.personHead}>
        <div className={s.who}>
          <span className={s.name}>
            {person.name ?? person.email}
            {isYou && <span className={s.you}>you</span>}
          </span>
          <span className={s.email}>{person.email}</span>
        </div>

        <span className={s.state} data-status={person.status}>
          {person.status}
        </span>
      </div>

      <div className={s.roleTags}>
        {person.roles.length === 0 ? (
          <span className={s.noRoles}>no roles</span>
        ) : (
          person.roles.map((role) => (
            <span key={role} className={s.tag}>
              {role}
            </span>
          ))
        )}
        <span className={s.sessions}>
          {person.sessions === 0
            ? "not signed in"
            : `${person.sessions} session${person.sessions === 1 ? "" : "s"}`}
        </span>
      </div>

      <div className={s.actions}>
        <button type="button" className={s.small} onClick={() => setOpen((was) => !was)}>
          {open ? "Close" : "Change roles"}
        </button>

        {person.sessions > 0 && (
          <form action={endSessions}>
            <input type="hidden" name="userId" value={person.id} />
            <Pending label="Sign out everywhere" busy="Ending…" />
          </form>
        )}

        {/* Suspending yourself would end your own session mid-click. */}
        {!isYou && (
          <form action={changeStatus}>
            <input type="hidden" name="userId" value={person.id} />
            <input
              type="hidden"
              name="next"
              value={person.status === "suspended" ? "active" : "suspended"}
            />
            <Pending
              label={person.status === "suspended" ? "Reinstate" : "Suspend"}
              busy="Saving…"
            />
          </form>
        )}
      </div>

      {open && (
        <form action={saveRoles} className={s.roleForm}>
          <input type="hidden" name="userId" value={person.id} />
          <fieldset className={s.fieldset}>
            <legend className={s.legend}>What they can reach</legend>
            {ROLES.map((role: Role) => (
              <label key={role} className={s.check}>
                <input
                  type="checkbox"
                  name="roles"
                  value={role}
                  defaultChecked={person.roles.includes(role)}
                />
                <span>
                  <strong>{role}</strong>
                  <span className={s.blurb}>{ROLE_BLURB[role]}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <Pending label="Save roles" busy="Saving…" />
        </form>
      )}

      {message && (
        <p
          className={message.status === "error" ? s.bad : s.good}
          role={message.status === "error" ? "alert" : "status"}
        >
          {message.message}
        </p>
      )}
    </li>
  );
}
