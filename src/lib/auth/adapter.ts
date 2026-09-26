import "server-only";

import type { Adapter, AdapterSession, AdapterUser } from "next-auth/adapters";

import {
  consumeVerificationToken,
  createSession,
  createVerificationToken,
  deleteSession,
  findSession,
  findSessionWithUser,
  findUserByEmail,
  findUserById,
  touchSession,
  type StaffUser,
} from "./store";

function toAdapterUser(user: StaffUser): AdapterUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
    // Carried through rather than looked up again. The session callback runs on every
    // request, and re-reading the account there was a second round trip for something
    // this query already had in hand.
    tier: user.tier,
    roles: user.roles,
    // Nothing reaches this adapter without an invitation, so the address was already
    // established when the account was created. Auth.js only reads this to decide
    // whether to write it back, and there is nothing here to write.
    emailVerified: null,
  };
}

/** Auth.js over the admin tables in Neon.
 *
 * Written by hand rather than installed: the official adapters bring an ORM and a
 * schema shaped around OAuth accounts, and this app has five tables, raw SQL
 * everywhere else, and exactly one sign-in method. */
export function neonAdapter(): Adapter {
  return {
    // Staff arrive by invitation. If Auth.js ever reaches this, something upstream
    // failed open, and creating an account is the worst possible way to find out.
    async createUser() {
      throw new Error("Staff accounts are created by invitation, never by signing in.");
    },

    async getUser(id) {
      const user = await findUserById(id);
      return user ? toAdapterUser(user) : null;
    },

    async getUserByEmail(email) {
      const user = await findUserByEmail(email);
      return user ? toAdapterUser(user) : null;
    },

    // No OAuth providers, so nothing is ever linked to an external account.
    async getUserByAccount() {
      return null;
    },

    async updateUser(user) {
      const existing = await findUserById(String(user.id));
      if (!existing) throw new Error(`No staff account ${user.id}`);
      return toAdapterUser(existing);
    },

    async linkAccount() {
      throw new Error("The admin has no OAuth providers.");
    },

    async createSession({ sessionToken, userId, expires }) {
      await createSession({ token: sessionToken, userId, expires });
      return { sessionToken, userId, expires };
    },

    async getSessionAndUser(sessionToken) {
      // Auth.js asks for this on every request, so it is one joined query rather than
      // a session lookup followed by a user lookup.
      const found = await findSessionWithUser(sessionToken);
      if (!found) return null;

      // A suspended account keeps its session row until someone revokes it, so the
      // check has to happen on read as well as at sign-in.
      if (found.user.status === "suspended") return null;

      const adapterSession: AdapterSession = {
        sessionToken,
        userId: found.user.id,
        expires: found.expiresAt,
      };
      return { session: adapterSession, user: toAdapterUser(found.user) };
    },

    async updateSession({ sessionToken, expires }) {
      if (!expires) return null;
      await touchSession(sessionToken, expires);
      const session = await findSession(sessionToken);
      return session
        ? { sessionToken, userId: session.user_id, expires: session.expires_at }
        : null;
    },

    async deleteSession(sessionToken) {
      await deleteSession(sessionToken);
    },

    async createVerificationToken({ identifier, token, expires }) {
      await createVerificationToken({ email: identifier, token, expires });
      return { identifier, token, expires };
    },

    async useVerificationToken({ identifier, token }) {
      const claimed = await consumeVerificationToken(identifier, token);
      return claimed ? { identifier: claimed.email, token, expires: claimed.expires } : null;
    },
  };
}
