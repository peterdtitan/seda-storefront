"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { ROLES, type AnyAccount } from "@/lib/admin/roles";

import { changeTier, grantRoles, killSessions, type AccountState } from "./actions";
import s from "./accounts.module.css";

function Go({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={s.small} disabled={pending}>
      {pending ? busy : label}
    </button>
  );
}

export function AccountRow({ account, isYou }: { account: AnyAccount; isYou: boolean }) {
  const [open, setOpen] = useState(false);
  const idle: AccountState = { status: "idle" };
  const [roleState, saveRoles] = useActionState<AccountState, FormData>(grantRoles, idle);
  const [tierState, moveTier] = useActionState<AccountState, FormData>(changeTier, idle);
  const [sessionState, endThem] = useActionState<AccountState, FormData>(killSessions, idle);

  const message = [roleState, tierState, sessionState].find(
    (state): state is Exclude<AccountState, { status: "idle" }> => state.status !== "idle",
  );

  return (
    <li className={s.account} data-tier={account.tier} data-status={account.status}>
      <div className={s.top}>
        <span className={s.who}>
          {account.name ?? account.email}
          {isYou && <span className={s.you}>you</span>}
          <span className={s.email}>{account.email}</span>
        </span>
        <span className={s.tierTag} data-tier={account.tier}>
          {account.tier}
        </span>
      </div>

      <div className={s.meta}>
        {account.roles.length === 0 ? (
          <span className={s.none}>no roles</span>
        ) : (
          account.roles.map((role) => (
            <span key={role} className={s.tag}>
              {role}
            </span>
          ))
        )}
        <span className={s.sessions}>
          {account.sessions === 0 ? "signed out" : `${account.sessions} live`}
        </span>
      </div>

      <div className={s.actions}>
        <button type="button" className={s.small} onClick={() => setOpen((was) => !was)}>
          {open ? "Close" : "Roles"}
        </button>

        <form action={moveTier}>
          <input type="hidden" name="userId" value={account.id} />
          <input
            type="hidden"
            name="tier"
            value={account.tier === "superuser" ? "staff" : "superuser"}
          />
          <Go
            label={account.tier === "superuser" ? "Make staff" : "Make superuser"}
            busy="Saving…"
          />
        </form>

        {account.sessions > 0 && (
          <form action={endThem}>
            <input type="hidden" name="userId" value={account.id} />
            <Go label="End sessions" busy="Ending…" />
          </form>
        )}
      </div>

      {open && (
        <form action={saveRoles} className={s.roleForm}>
          <input type="hidden" name="userId" value={account.id} />
          <div className={s.checks}>
            {ROLES.map((role) => (
              <label key={role} className={s.check}>
                <input
                  type="checkbox"
                  name="roles"
                  value={role}
                  defaultChecked={account.roles.includes(role)}
                />
                {role}
              </label>
            ))}
          </div>
          {/* No last-owner guard here, unlike the shop admin's version: from this
              surface there is always a way back. */}
          <Go label="Save" busy="Saving…" />
        </form>
      )}

      {message && (
        <p className={message.status === "error" ? s.bad : s.good} role="status">
          {message.message}
        </p>
      )}
    </li>
  );
}
