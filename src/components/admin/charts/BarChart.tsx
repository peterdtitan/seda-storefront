import s from "./charts.module.css";

export type Bar = { label: string; value: number; note?: string };

/** Horizontal bars, because the labels are product and category names rather than
 * dates — vertical bars would turn every one of them sideways. */
export function BarChart({
  bars,
  format = (n: number) => String(n),
  max,
}: {
  bars: Bar[];
  format?: (value: number) => string;
  max?: number;
}) {
  const peak = Math.max(1, max ?? 0, ...bars.map((bar) => bar.value));

  return (
    <ol className={s.bars}>
      {bars.map((bar, index) => (
        // Labels are not unique: the same colourway name belongs to more than one
        // piece. The position in an ordered, static list is.
        <li
          key={`${index}-${bar.label}`}
          className={s.bar}
          style={{ "--i": index } as React.CSSProperties}
        >
          <span className={s.barLabel}>
            {bar.label}
            {bar.note && <span className={s.barNote}>{bar.note}</span>}
          </span>
          <span className={s.barTrack}>
            <span
              className={s.barFill}
              style={{ "--to": `${Math.max(1, (bar.value / peak) * 100)}%` } as React.CSSProperties}
            />
          </span>
          <span className={s.barValue}>{format(bar.value)}</span>
        </li>
      ))}
    </ol>
  );
}
