import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { requireSql } from "@/lib/db";

export type Tier = "staff" | "superuser";
export type Role = "content" | "refunds" | "delivery" | "finance" | "owner";

export type StaffUser = {
  id: string;
  email: string;
  name: string | null;
  tier: Tier;
  status: "invited" | "active" | "suspended";
  roles: Role[];
};

/** Tokens are compared by hash, so a database dump cannot be replayed as a session.
 * SHA-256 rather than a password hash on purpose: these are 32 bytes of CSPRNG output,
 * not something a human chose, so there is nothing to brute force. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  tier: Tier;
  status: StaffUser["status"];
  roles: Role[] | null;
};

const SELECT_USER = `
  select u.id::text, u.email, u.name, u.tier, u.status,
         array_remove(array_agg(r.role), null) as roles
  from admin_users u
  left join admin_roles r on r.user_id = u.id
`;

function toUser(row: UserRow | undefined): StaffUser | null {
  if (!row) return null;
  return { ...row, roles: row.roles ?? [] };
}

export async function findUserByEmail(email: string): Promise<StaffUser | null> {
  const sql = requireSql();
  const [row] = await sql<UserRow[]>`
    ${sql.unsafe(SELECT_USER)}
    where lower(u.email) = lower(${email})
    group by u.id
  `;
  return toUser(row);
}

export async function findUserById(id: string): Promise<StaffUser | null> {
  const sql = requireSql();
  const [row] = await sql<UserRow[]>`
    ${sql.unsafe(SELECT_USER)}
    where u.id = ${Number(id)}
    group by u.id
  `;
  return toUser(row);
}

/** Only ever called for an address that already has a row. Sign-in does not create
 * staff — an account arrives by invitation, never by someone typing their address. */
export async function markSignedIn(id: string) {
  const sql = requireSql();
  await sql`
    update admin_users
    set last_seen_at = now(), status = case when status = 'invited' then 'active' else status end
    where id = ${Number(id)}
  `;
}

export async function createSession(input: {
  token: string;
  userId: string;
  expires: Date;
  userAgent?: string | null;
  ip?: string | null;
}) {
  const sql = requireSql();
  await sql`
    insert into admin_sessions (token_hash, user_id, expires_at, user_agent, ip)
    values (${hashToken(input.token)}, ${Number(input.userId)}, ${input.expires},
            ${input.userAgent ?? null}, ${input.ip ?? null})
  `;
}

export type SessionRow = { user_id: string; expires_at: Date };

export type SessionAndUser = { expiresAt: Date; user: StaffUser };

/** Session and account in one round trip.
 *
 * Auth.js asks for these separately, and on a database strategy it asks on every
 * request. Two sequential queries to Neon is most of a page's latency before any of
 * its own data is fetched. */
export async function findSessionWithUser(token: string): Promise<SessionAndUser | null> {
  const sql = requireSql();
  const [row] = await sql<(UserRow & { expires_at: Date })[]>`
    select u.id::text, u.email, u.name, u.tier, u.status, s.expires_at,
           array_remove(array_agg(r.role), null) as roles
    from admin_sessions s
    join admin_users u on u.id = s.user_id
    left join admin_roles r on r.user_id = u.id
    where s.token_hash = ${hashToken(token)} and s.expires_at > now()
    group by u.id, s.expires_at
  `;

  const user = toUser(row);
  if (!user) return null;
  return { expiresAt: row.expires_at, user };
}

export async function findSession(token: string): Promise<SessionRow | null> {
  const sql = requireSql();
  const [row] = await sql<SessionRow[]>`
    select user_id::text, expires_at from admin_sessions
    where token_hash = ${hashToken(token)} and expires_at > now()
  `;
  return row ?? null;
}

export async function touchSession(token: string, expires: Date) {
  const sql = requireSql();
  await sql`
    update admin_sessions set expires_at = ${expires}
    where token_hash = ${hashToken(token)}
  `;
}

export async function deleteSession(token: string) {
  const sql = requireSql();
  await sql`delete from admin_sessions where token_hash = ${hashToken(token)}`;
}

/** Used when an owner revokes someone, or a staff member signs out everywhere. */
export async function deleteSessionsForUser(userId: string) {
  const sql = requireSql();
  await sql`delete from admin_sessions where user_id = ${Number(userId)}`;
}

export async function createVerificationToken(input: {
  email: string;
  token: string;
  expires: Date;
}) {
  const sql = requireSql();
  await sql`
    insert into admin_verification_tokens (token_hash, email, expires_at)
    values (${hashToken(input.token)}, ${input.email}, ${input.expires})
  `;
}

/** Claims the token and reports whether this caller got it.
 *
 * The update is the guard: a link forwarded, or fetched twice by an email client that
 * prefetches, matches no unconsumed row the second time. */
export async function consumeVerificationToken(
  email: string,
  token: string,
): Promise<{ email: string; expires: Date } | null> {
  const sql = requireSql();
  const [row] = await sql<{ email: string; expires_at: Date }[]>`
    update admin_verification_tokens set consumed_at = now()
    where token_hash = ${hashToken(token)}
      and lower(email) = lower(${email})
      and consumed_at is null
      and expires_at > now()
    returning email, expires_at
  `;
  return row ? { email: row.email, expires: row.expires_at } : null;
}

/** Housekeeping. Expired rows are harmless but there is no reason to keep them. */
export async function purgeExpired() {
  const sql = requireSql();
  await sql`delete from admin_sessions where expires_at < now()`;
  await sql`delete from admin_verification_tokens where expires_at < now() - interval '7 days'`;
}
