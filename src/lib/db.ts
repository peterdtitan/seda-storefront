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

/** For work that must not proceed without a database. Analytics can be dropped;
 * an order cannot — taking a payment we have no record of is worse than failing. */
export function requireSql() {
  if (!sql) {
    throw new Error("DATABASE_URL is not set — refusing to handle an order without it.");
  }
  return sql;
}
