import m from "./motion.module.css";
import s from "./loading.module.css";

/**
 * What a panel looks like while its query is in flight.
 *
 * Shaped like the thing it replaces rather than a spinner, so the page does not jump
 * when the real content lands. Paired with Suspense, this is what makes the shell
 * paint immediately instead of waiting on Neon.
 */
export function PanelSkeleton({ rows = 4, title = true }: { rows?: number; title?: boolean }) {
  return (
    <div className={s.panel} aria-hidden="true">
      {title && <span className={`${s.bar} ${m.shimmer}`} style={{ width: "34%", height: 20 }} />}
      {Array.from({ length: rows }, (_, index) => (
        <span
          key={index}
          className={`${s.bar} ${m.shimmer}`}
          style={{ width: `${88 - index * 9}%` }}
        />
      ))}
    </div>
  );
}

export function TileSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className={s.tiles} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className={s.tile}>
          <span className={`${s.bar} ${m.shimmer}`} style={{ width: "58%", height: 10 }} />
          <span className={`${s.bar} ${m.shimmer}`} style={{ width: "44%", height: 26 }} />
          <span className={`${s.bar} ${m.shimmer}`} style={{ width: "70%", height: 10 }} />
        </li>
      ))}
    </ul>
  );
}

export function ChartSkeleton({ height = 180 }: { height?: number }) {
  return (
    <div className={s.panel} aria-hidden="true">
      <span className={`${s.bar} ${m.shimmer}`} style={{ width: "28%", height: 20 }} />
      <span className={`${s.block} ${m.shimmer}`} style={{ height }} />
    </div>
  );
}

/** The one place a word appears, for anyone who cannot see the shapes move. */
export function Busy({ what }: { what: string }) {
  return (
    <span className={s.sr} role="status">
      Loading {what}
    </span>
  );
}
