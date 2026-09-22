import "server-only";

import postgres from "postgres";

const connectionString = process.env.DATABASE_URL ?? "";

export const isAnalyticsConfigured = connectionString.length > 0;

let warned = false;

// Same posture as the Sanity client: an unset DATABASE_URL must never fail a build or
// a request. Analytics is telemetry, not a feature the shopper is waiting on.
export const sql = isAnalyticsConfigured
  ? postgres(connectionString, {
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    })
  : null;

export function warnUnconfigured() {
  if (!warned) {
    warned = true;
    console.warn("[analytics] DATABASE_URL is not set — events are dropped.");
  }
}
