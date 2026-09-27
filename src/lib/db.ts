import "server-only";

import postgres from "postgres";

const connectionString = process.env.DATABASE_URL ?? "";

export const isDatabaseConfigured = connectionString.length > 0;

/** One pool for the whole app. Null when DATABASE_URL is unset, so a missing
 * database never fails a build — callers decide whether that is survivable. */
export const sql = isDatabaseConfigured
  ? postgres(connectionString, {
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    })
  : null;

/**
 * Connection failures that are worth one more go.
 *
 * Deliberately not CONNECT_TIMEOUT: that one has already spent the full connect_timeout
 * waiting, and retrying it doubles a ten-second stall into twenty. These all fail fast —
 * the host refused, the socket dropped, DNS blinked — so a second attempt costs
 * milliseconds and usually succeeds.
 */
const RETRYABLE = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "EPIPE",
  "ENOTFOUND",
  "EAI_AGAIN",
  "CONNECTION_CLOSED",
  "CONNECTION_ENDED",
  "CONNECTION_DESTROYED",
]);

export function isTransientConnectionError(error: unknown): boolean {
  // Node's dual-stack connect reports every address it tried as one AggregateError,
  // which is what a Neon blip actually looks like from here.
  if (error instanceof AggregateError) return error.errors.some(isTransientConnectionError);

  const wrapped = (error as { errors?: unknown[] })?.errors;
  if (Array.isArray(wrapped)) return wrapped.some(isTransientConnectionError);

  const code = (error as { code?: unknown })?.code;
  return typeof code === "string" && RETRYABLE.has(code);
}

/**
 * One retry for a read whose connection died on the way out.
 *
 * Reads only, and the caller has to choose it. Replaying a write after an ambiguous
 * failure is how an order gets charged twice, so this must never be wrapped around
 * anything that mutates.
 *
 * The case that made it worth having: Neon is in another continent and occasionally
 * refuses a connection for a moment. When that lands on the session lookup, Auth.js
 * cannot tell "the database blinked" from "there is no session" and signs the person
 * out — and with magic links, getting back in means waiting for an email.
 */
export async function readWithRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!isTransientConnectionError(error)) throw error;

    await new Promise((resolve) => setTimeout(resolve, 250));
    return run();
  }
}

/** For work that must not proceed without a database. Analytics can be dropped;
 * an order cannot — taking a payment we have no record of is worse than failing. */
export function requireSql() {
  if (!sql) {
    throw new Error("DATABASE_URL is not set — refusing to handle an order without it.");
  }
  return sql;
}
