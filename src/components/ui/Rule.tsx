import type { CSSProperties } from "react";

import s from "./Rule.module.css";

export function Rule({
  tone,
  grow,
  style,
}: {
  tone?: "cream";
  grow?: boolean;
  style?: CSSProperties;
}) {
  return (
    <hr
      className={[s.rule, tone === "cream" ? s.cream : "", grow ? s.grow : ""]
        .filter(Boolean)
        .join(" ")}
      style={style}
    />
  );
}
