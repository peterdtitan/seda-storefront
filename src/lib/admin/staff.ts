import "server-only";

import { requireSql, sql } from "@/lib/db";
import type { Role } from "@/lib/auth/store";

import type { AnyAccount, StaffRow } from "./roles";

/**
 * Everyone this admin is allowed to know about.
 *
 * The tier filter is the whole reason the superuser is invisible here — not a missing
 * link or a hidden row, but a where clause every staff-facing query carries.
 */
export async function listStaff(): Promise<StaffRow[]> {
  if (!sql) return [];

  const rows = await sql<
    {
      id: string;
      email: string;
      name: string | null;
      status: string;
      roles: Role[] | null;
      created_at: Date;
      last_seen_at: Date | null;
      sessions: string;
    }[]
  >`
    select u.id::text, u.email, u.name, u.status, u.created_at, u.last_seen_at,
           array_remove(array_agg(distinct r.role), null) as roles,
           (select count(*) from admin_sessions s
            where s.user_id = u.id and s.expires_at > now()) as sessions
    from admin_users u
    left join admin_roles r on r.user_id = u.id
    where u.tier = 'staff'
    group by u.id
    order by u.created_at
  `;

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    status: row.status,
    roles: row.roles ?? [],
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    sessions: Number(row.sessions),
  }));
}

export async function inviteStaff(input: {
  email: string;
  name: string | null;
  roles: Role[];
  by: { id: string; email: string };
}): Promise<{ ok: true; created: boolean } | { ok: false; message: string }> {
  const db = requireSql();
  const email = input.email.trim().toLowerCase();

  // A superuser address must not be quietly turned into staff by someone typing it
  // into this form — that would put them on a list they are deliberately kept off.
  const [existing] = await db<{ id: string; tier: string }[]>`
    select id::text, tier from admin_users where lower(email) = ${email}
  `;
  if (existing?.tier === "superuser") {
    return { ok: false, message: "That address is not available." };
  }

  const [user] = await db<{ id: string }[]>`
    insert into admin_users (email, name, tier, status)
    values (${email}, ${input.name}, 'staff', 'invited')
    on conflict (email) do update
      set name = coalesce(excluded.name, admin_users.name),
          status = case when admin_users.status = 'suspended' then 'invited'
                        else admin_users.status end
    returning id::text
  `;

  if (input.roles.length) {
    await db`
      insert into admin_roles ${db(
        input.roles.map((role) => ({
          user_id: Number(user.id),
          role,
          granted_by: Number(input.by.id),
        })),
      )}
      on conflict do nothing
    `;
  }

  return { ok: true, created: !existing };
}

export async function setRoles(input: {
  userId: string;
  roles: Role[];
  by: { id: string; email: string };
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const db = requireSql();

  const [target] = await db<{ tier: string }[]>`
    select tier from admin_users where id = ${Number(input.userId)}
  `;
  if (!target) return { ok: false, message: "No such account." };
  if (target.tier !== "staff") return { ok: false, message: "That account is not staff." };

  // Removing the last owner locks everyone out of inviting anybody, and there is no
  // screen left that could put it back.
  if (!input.roles.includes("owner")) {
    const [{ owners }] = await db<{ owners: string }[]>`
      select count(*) as owners from admin_roles r
      join admin_users u on u.id = r.user_id
      where r.role = 'owner' and u.tier = 'staff' and u.status <> 'suspended'
        and r.user_id <> ${Number(input.userId)}
    `;
    if (Number(owners) === 0) {
      return { ok: false, message: "Someone has to be an owner. Make another one first." };
    }
  }

  await db.begin(async (tx) => {
    await tx`delete from admin_roles where user_id = ${Number(input.userId)}`;
    if (input.roles.length) {
      await tx`
        insert into admin_roles ${tx(
          input.roles.map((role) => ({
            user_id: Number(input.userId),
            role,
            granted_by: Number(input.by.id),
          })),
        )}
      `;
    }
  });

  return { ok: true };
}

export async function setStatus(input: {
  userId: string;
  status: "active" | "suspended";
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const db = requireSql();

  if (input.status === "suspended") {
    const [{ owners }] = await db<{ owners: string }[]>`
      select count(*) as owners from admin_roles r
      join admin_users u on u.id = r.user_id
      where r.role = 'owner' and u.tier = 'staff' and u.status = 'active'
        and r.user_id <> ${Number(input.userId)}
    `;
    if (Number(owners) === 0) {
      return { ok: false, message: "That is the last active owner. Promote someone first." };
    }
  }

  await db`
    update admin_users set status = ${input.status}
    where id = ${Number(input.userId)} and tier = 'staff'
  `;

  // Suspension has to end the sessions too, or the person stays signed in until the
  // cookie expires — which is exactly the window you were trying to close.
  if (input.status === "suspended") {
    await db`delete from admin_sessions where user_id = ${Number(input.userId)}`;
  }

  return { ok: true };
}

export async function endSessionsFor(userId: string) {
  const db = requireSql();
  const rows = await db<{ token_hash: string }[]>`
    delete from admin_sessions where user_id = ${Number(userId)} returning token_hash
  `;
  return rows.length;
}

/** Everyone, both tiers. Only the superuser surface calls this — the shop admin's
 * listStaff filters to staff, which is what keeps this tier off that screen. */
export async function listAllAccounts(): Promise<AnyAccount[]> {
  if (!sql) return [];

  const rows = await sql<
    {
      id: string;
      email: string;
      name: string | null;
      tier: string;
      status: string;
      roles: Role[] | null;
      created_at: Date;
      last_seen_at: Date | null;
      sessions: string;
    }[]
  >`
    select u.id::text, u.email, u.name, u.tier, u.status, u.created_at, u.last_seen_at,
           array_remove(array_agg(distinct r.role), null) as roles,
           (select count(*) from admin_sessions s
            where s.user_id = u.id and s.expires_at > now()) as sessions
    from admin_users u
    left join admin_roles r on r.user_id = u.id
    group by u.id
    order by u.tier desc, u.created_at
  `;

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    tier: row.tier,
    status: row.status,
    roles: row.roles ?? [],
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    sessions: Number(row.sessions),
  }));
}

/** Superuser only, and it refuses to leave nobody holding the keys. */
export async function setTier(input: {
  userId: string;
  tier: "staff" | "superuser";
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const db = requireSql();

  if (input.tier === "staff") {
    const [{ others }] = await db<{ others: string }[]>`
      select count(*) as others from admin_users
      where tier = 'superuser' and status <> 'suspended' and id <> ${Number(input.userId)}
    `;
    if (Number(others) === 0) {
      return { ok: false, message: "That is the last superuser. Make another one first." };
    }
  }

  await db`update admin_users set tier = ${input.tier} where id = ${Number(input.userId)}`;
  return { ok: true };
}

/** The unguarded version. setRoles refuses to remove the last owner because the shop
 * admin has no way back from that; here there is one, so a superuser may do it. */
export async function forceRoles(input: { userId: string; roles: Role[]; by: { id: string } }) {
  const db = requireSql();
  await db.begin(async (tx) => {
    await tx`delete from admin_roles where user_id = ${Number(input.userId)}`;
    if (input.roles.length) {
      await tx`
        insert into admin_roles ${tx(
          input.roles.map((role) => ({
            user_id: Number(input.userId),
            role,
            granted_by: Number(input.by.id),
          })),
        )}
      `;
    }
  });
}
