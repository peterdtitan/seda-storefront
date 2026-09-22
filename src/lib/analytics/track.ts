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

  queue.push({
    ...payload,
    name,
    visitorId: readOrCreate("local", VISITOR_KEY),
    sessionId: readOrCreate("session", SESSION_KEY),
    path: payload.path ?? window.location.pathname + window.location.search,
    referrer: payload.referrer ?? (document.referrer || undefined),
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
