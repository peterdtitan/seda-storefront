import "server-only";

import { isDatabaseConfigured, sql } from "@/lib/db";

export { sql };

export const isAnalyticsConfigured = isDatabaseConfigured;

let warned = false;

// Analytics is telemetry, not a feature the shopper is waiting on, so an unset
// DATABASE_URL drops events rather than surfacing anything.
export function warnUnconfigured() {
  if (!warned) {
    warned = true;
    console.warn("[analytics] DATABASE_URL is not set — events are dropped.");
  }
}
