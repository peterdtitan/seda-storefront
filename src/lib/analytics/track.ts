"use client";

import type { EventName, EventPayload } from "./events";

const VISITOR_KEY = "seda.vid";
const SESSION_KEY = "seda.sid";
const ENDPOINT = "/api/events";

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Private browsing and blocked site data both make storage throw rather than return
// null, so every read and write is guarded. A visitor we cannot identify still gets
// tracked, just as a new one each time.
function readOrCreate(store: "local" | "session", key: string): string {
  try {
    const target = store === "local" ? window.localStorage : window.sessionStorage;
    const existing = target.getItem(key);
    if (existing) return existing;
    const created = randomId();
    target.setItem(key, created);
    return created;
  } catch {
    return randomId();
  }
}

/** The ids the checkout form hands to the server, so a payment recorded server side
 * lands on the same session that browsed. */
export function identity(): { visitorId: string; sessionId: string } {
  if (typeof window === "undefined") return { visitorId: "", sessionId: "" };
  return {
    visitorId: readOrCreate("local", VISITOR_KEY),
    sessionId: readOrCreate("session", SESSION_KEY),
  };
}

const CAMPAIGN_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

// The whole query string used to go into path, which put the Paystack reference from
// the callback URL into a telemetry row and gave every one of them a path of its own.
// Only the campaign survives, and it goes in props where it can be grouped on.
function campaign(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const found: Record<string, string> = {};
  for (const key of CAMPAIGN_KEYS) {
    const value = params.get(key);
    if (value) found[key] = value.slice(0, 64);
  }
  return found;
}

let queue: Record<string, unknown>[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function send(batch: Record<string, unknown>[]) {
  if (batch.length === 0) return;
  const body = JSON.stringify(batch);

  // sendBeacon survives the page unloading, which is exactly when a click-through
  // event would otherwise be lost.
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const ok = navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
    if (ok) return;
  }

  void fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const batch = queue;
  queue = [];
  send(batch);
}

export function track(name: EventName, payload: Omit<EventPayload, "name"> = {}) {
  if (typeof window === "undefined") return;

  const marks = campaign();

  queue.push({
    ...payload,
    name,
    ...identity(),
    path: payload.path ?? window.location.pathname,
    referrer: payload.referrer ?? (document.referrer || undefined),
    props: { ...marks, ...payload.props },
  });

  // A short debounce coalesces the burst a product page fires on mount without
  // delaying anything a human would notice.
  if (!flushTimer) flushTimer = setTimeout(flush, 800);
  if (queue.length >= 10) flush();
}

if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
}
