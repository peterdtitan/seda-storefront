import type { CSSProperties } from "react";

import s from "./Skeleton.module.css";

type Vars = CSSProperties & Record<`--${string}`, string>;

/** A placeholder block. aria-hidden throughout: the surrounding loading screen
 * announces itself once, and a screen reader has nothing to gain from a shape. */
export function Skeleton({
  height,
  width,
  radius,
  className,
}: {
  height: string;
  width?: string;
  radius?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={[s.block, className].filter(Boolean).join(" ")}
      style={
        {
          "--sk-h": height,
          ...(width ? { "--sk-w": width } : {}),
          ...(radius ? { "--sk-r": radius } : {}),
        } as Vars
      }
    />
  );
}

/** Wraps a skeleton screen so assistive tech hears "Loading" once rather than
 * reading a wall of empty boxes. */
export function LoadingScreen({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className} aria-busy="true">
      <span className="seda-visually-hidden" role="status">
        {label}
      </span>
      {children}
    </div>
  );
}
