import type { ReactNode } from "react";

import { BrandBody, Display, Eyebrow } from "@/components/ui/Text";

import s from "./StateMessage.module.css";

export type StateTone = "quiet" | "fault";

/** The one panel behind every empty, unavailable, 404 and error screen. None of these
 * were designed, so they are built from the token set and share a shape: eyebrow,
 * display line, a sentence that says what happened, and a way out. */
export function StateMessage({
  eyebrow,
  title,
  body,
  tone = "quiet",
  children,
  compact,
  as = "p",
}: {
  eyebrow?: string;
  title: string;
  body?: ReactNode;
  tone?: StateTone;
  children?: ReactNode;
  compact?: boolean;
  /** h1 when this panel replaces the page outright, so the page keeps a heading. */
  as?: "h1" | "h2" | "p";
}) {
  return (
    <div className={[s.panel, compact ? s.compact : ""].filter(Boolean).join(" ")}>
      {eyebrow && (
        <Eyebrow colour={tone === "fault" ? "var(--seda-oxblood)" : undefined}>{eyebrow}</Eyebrow>
      )}

      <Display as={as} className={s.title}>
        {title}
      </Display>

      {body && (
        <BrandBody max="46ch" className={s.body}>
          {body}
        </BrandBody>
      )}

      {children && <div className={s.actions}>{children}</div>}
    </div>
  );
}
