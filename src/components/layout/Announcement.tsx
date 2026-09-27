"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import type { AnnouncementCopy } from "@/lib/announcement";

import s from "./Announcement.module.css";

/** Dismissal is remembered against the message itself, so a new announcement shows
 * again to someone who closed the last one — rather than against a version number
 * nobody would remember to bump. */
function keyFor(message: string) {
  let hash = 0;
  for (let i = 0; i < message.length; i++) hash = (hash * 31 + message.charCodeAt(i)) | 0;
  return `seda.ann.${hash}`;
}

// localStorage is an external store, and writing to it does not notify the tab that
// wrote it. This is the subscription React needs to re-render after a dismissal.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab dismissing the same bar should close it here too.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function dismiss(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* private browsing: it returns next visit, which is survivable */
  }
  listeners.forEach((notify) => notify());
}

export function Announcement({ copy }: { copy: AnnouncementCopy }) {
  const message = copy.message?.trim() ?? "";
  const key = keyFor(message);

  const dismissed = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(key) === "1";
      } catch {
        return false;
      }
    },
    // Rendered on the server as *not* dismissed, so the bar is in the first HTML.
    // The alternative shifts every page down a row once hydration runs, and a layout
    // shift on every visit costs more than a brief flash for the few who closed it.
    () => false,
  );

  if (!message || dismissed) return null;

  const href = copy.linkHref?.trim();
  const label = copy.linkLabel?.trim();

  return (
    <aside className={s.bar} aria-label="Announcement">
      <p className={s.message}>
        {message}
        {href && label && (
          <Link href={href} className={s.link}>
            {label}
            <span aria-hidden="true"> →</span>
          </Link>
        )}
      </p>

      <button
        type="button"
        className={s.close}
        onClick={() => dismiss(key)}
        aria-label="Dismiss announcement"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </aside>
  );
}
