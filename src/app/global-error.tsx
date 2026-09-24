"use client";

import { fontVariables } from "@/styles/fonts";

import "./globals.css";

/** Only reached when the root layout itself fails, so it has to supply its own
 * html and body. No header, no footer, no CMS read — nothing that could be the
 * thing that just broke. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <main
          style={{
            minHeight: "100dvh",
            display: "grid",
            placeContent: "center",
            textAlign: "center",
            padding: "40px 20px",
            gap: "18px",
          }}
        >
          <p className="seda-disp" style={{ margin: 0 }}>
            Șèdá is briefly offline
          </p>
          <p className="seda-brand-body" style={{ margin: 0 }}>
            Something failed before the page could be built. Reloading usually fixes it.
          </p>
          <div>
            <button
              type="button"
              onClick={reset}
              style={{
                font: "var(--type-label)",
                fontFamily: "var(--font-ui)",
                letterSpacing: "var(--ls-label)",
                textTransform: "uppercase",
                background: "var(--action-primary-bg)",
                color: "var(--action-primary-fg)",
                border: 0,
                padding: "14px 28px",
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
          {error.digest && (
            <p className="seda-ui-label" style={{ margin: 0 }}>
              Reference: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
