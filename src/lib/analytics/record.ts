import "server-only";

import { isEventName, type StoredEvent } from "./events";
import { sql, warnUnconfigured } from "./db";

export type RequestContext = {
  country?: string;
  userAgent?: string;
};

export function parseEvents(body: unknown): StoredEvent[] {
  const raw = Array.isArray(body) ? body : [body];

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const e = entry as Record<string, unknown>;

    if (!isEventName(e.name)) return [];
    if (typeof e.visitorId !== "string" || typeof e.sessionId !== "string") return [];

    const str = (v: unknown) => (typeof v === "string" && v.length <= 512 ? v : undefined);
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

    return [
      {
        name: e.name,
        visitorId: e.visitorId.slice(0, 64),
        sessionId: e.sessionId.slice(0, 64),
        path: str(e.path),
        referrer: str(e.referrer),
        productId: str(e.productId),
        productSlug: str(e.productSlug),
        productName: str(e.productName),
        colourway: str(e.colourway),
        size: str(e.size),
        quantity: num(e.quantity),
        valueKobo: num(e.valueKobo),
        props: e.props && typeof e.props === "object" ? (e.props as Record<string, unknown>) : {},
      },
    ];
  });
}

export async function recordEvents(events: StoredEvent[], context: RequestContext = {}) {
  if (events.length === 0) return;

  if (!sql) {
    warnUnconfigured();
    return;
  }

  const rows = events.map((event) => ({
    visitor_id: event.visitorId,
    session_id: event.sessionId,
    name: event.name,
    path: event.path ?? null,
    referrer: event.referrer ?? null,
    product_id: event.productId ?? null,
    product_slug: event.productSlug ?? null,
    product_name: event.productName ?? null,
    colourway: event.colourway ?? null,
    size: event.size ?? null,
    quantity: event.quantity ?? null,
    value_kobo: event.valueKobo ?? null,
    country: context.country ?? null,
    user_agent: context.userAgent?.slice(0, 512) ?? null,
    props: JSON.stringify(event.props ?? {}),
  }));

  try {
    await sql`insert into analytics_events ${sql(rows)}`;
  } catch (error) {
    console.error("[analytics] insert failed", error);
  }
}
