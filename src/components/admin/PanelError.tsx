"use client";

import Link from "next/link";

import s from "./panelError.module.css";

/**
 * What a failure inside the panel looks like.
 *
 * Without an error boundary here, anything that throws under /admin climbs past the
 * root layout to global-error, which replaces the whole document — nav, sidebar and
 * every unsaved field in the form the person was filling in. This keeps the failure
 * in the one pane it happened in and leaves a way out that is not the browser's
 * back button.
 */
export function PanelError({
  error,
  reset,
  homeHref = "/admin",
  homeLabel = "Back to the dashboard",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <div className={s.panel} role="alert">
      <h1 className={s.title}>That did not go through</h1>
      <p className={s.body}>
        Something failed on the way to the server. Nothing you had already saved is
        affected, and trying again usually works.
      </p>
      <div className={s.actions}>
        <button type="button" className={s.retry} onClick={reset}>
          Try again
        </button>
        <Link href={homeHref} className={s.back}>
          {homeLabel}
        </Link>
      </div>

      {/* The digest is the only handle on the server log for this exact failure.
          Worth showing: it turns "it broke" into something I can actually look up. */}
      {error.digest && <p className={s.digest}>Reference: {error.digest}</p>}
    </div>
  );
}
