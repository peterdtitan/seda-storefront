"use client";

import { useEffect, useRef } from "react";

import type { EventName, EventPayload } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";

/**
 * Fires one event when the page mounts. Keyed by `dedupe` so a filter change or a
 * colourway switch does not re-fire the page's own view event.
 */
export function Track({
  event,
  dedupe,
  ...payload
}: { event: EventName; dedupe?: string } & Omit<EventPayload, "name">) {
  const sent = useRef<string | null>(null);
  const key = dedupe ?? event;

  useEffect(() => {
    if (sent.current === key) return;
    sent.current = key;
    track(event, payload);
    // payload is captured intentionally; re-firing is governed by `key` alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
