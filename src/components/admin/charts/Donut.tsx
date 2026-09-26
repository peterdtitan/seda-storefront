import s from "./charts.module.css";

export type Slice = { label: string; value: number };

// Five is as many as a donut can carry before the slices stop being comparable.
const COLOURS = ["#5C0D00", "#A31D26", "#C79E32", "#065073", "#8A8A4A", "#A06F5E"];

/** A donut rather than a pie: the hole carries the total, which is the number people
 * actually want, and the arcs answer "roughly what share" without pretending to be
 * readable to a percentage point. */
export function Donut({
  slices,
  total,
  totalLabel,
}: {
  slices: Slice[];
  total: string;
  totalLabel: string;
}) {
  const sum = slices.reduce((all, slice) => all + slice.value, 0);
  if (sum === 0) return null;

  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  // Each arc starts where the previous one ended, so the offsets are a running total
  // taken before the map rather than accumulated during it.
  const starts = slices.reduce<number[]>(
    (all, slice, index) => [...all, (all[index] ?? 0) + (slice.value / sum) * circumference],
    [0],
  );

  const arcs = slices.map((slice, index) => {
    const share = slice.value / sum;
    return {
      ...slice,
      share,
      colour: COLOURS[index % COLOURS.length],
      dash: share * circumference,
      offset: starts[index],
    };
  });

  return (
    <figure className={s.donutFigure}>
      <svg
        viewBox="0 0 160 160"
        className={s.donut}
        role="img"
        aria-label={arcs.map((a) => `${a.label} ${Math.round(a.share * 100)}%`).join(", ")}
      >
        <g transform="rotate(-90 80 80)">
          {arcs.map((arc, index) => (
            <circle
              key={`${index}-${arc.label}`}
              cx="80"
              cy="80"
              r={radius}
              className={s.arc}
              style={
                {
                  stroke: arc.colour,
                  "--dash": arc.dash,
                  "--gap": circumference - arc.dash,
                  "--offset": -arc.offset,
                  "--i": index,
                } as React.CSSProperties
              }
            />
          ))}
        </g>
        <text x="80" y="76" className={s.donutTotal}>
          {total}
        </text>
        <text x="80" y="94" className={s.donutLabel}>
          {totalLabel}
        </text>
      </svg>

      <figcaption className={s.donutKeys}>
        {arcs.map((arc) => (
          <span key={`${arc.label}-${arc.value}`} className={s.donutKey}>
            <span className={s.dot} style={{ background: arc.colour }} aria-hidden="true" />
            {arc.label}
            <span className={s.donutShare}>{Math.round(arc.share * 100)}%</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
