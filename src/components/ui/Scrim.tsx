import s from "./Scrim.module.css";

export type ScrimDirection = "bottom" | "left" | "full" | "oxblood" | "ink";

export function Scrim({ dir = "bottom" }: { dir?: ScrimDirection }) {
  return <span className={[s.scrim, s[dir]].join(" ")} aria-hidden="true" />;
}
