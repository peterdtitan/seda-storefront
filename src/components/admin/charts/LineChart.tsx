import s from "./charts.module.css";

export type Series = {
  label: string;
  points: number[];
  /** How this series' own peak reads in the legend. */
  format?: (value: number) => string;
};

/**
 * Two series on one plot, drawn as SVG on the server.
 *
 * Hand-rolled rather than a charting library: this needs three shapes, and the
 * smallest of the usual packages is larger than everything else on the page put
 * together. Server-rendered SVG also paints with the HTML, so the chart is there on
 * the first frame rather than after a bundle loads and measures its container.
 */
export function LineChart({
  series,
  labels,
  height = 180,
  format = (n: number) => String(n),
}: {
  series: Series[];
  labels: string[];
  height?: number;
  format?: (value: number) => string;
}) {
  const width = 600;
  const pad = { top: 12, right: 8, bottom: 20, left: 8 };
  const inner = { w: width - pad.left - pad.right, h: height - pad.top - pad.bottom };

  const count = Math.max(...series.map((line) => line.points.length), 1);
  const x = (index: number) =>
    pad.left + (count === 1 ? inner.w / 2 : (index / (count - 1)) * inner.w);

  // Each series is scaled to its own peak. Revenue is in kobo and sessions are in
  // dozens; sharing one axis leaves the smaller line flat on the floor saying nothing.
  // The legend carries each peak, so the shapes stay comparable and the magnitudes
  // stay honest.
  const peaks = series.map((line) => Math.max(1, ...line.points));
  const y = (value: number, peak: number) => pad.top + inner.h - (value / peak) * inner.h;

  const path = (points: number[], peak: number) =>
    points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(v, peak)}`).join(" ");

  const area = (points: number[], peak: number) =>
    `${path(points, peak)} L${x(points.length - 1)} ${pad.top + inner.h} L${x(0)} ${pad.top + inner.h} Z`;

  // A handful of ticks; thirty dates collide into a grey smear.
  const ticks = labels
    .map((label, index) => ({ label, index }))
    .filter((_, index) => index % Math.ceil(count / 6) === 0 || index === count - 1);

  return (
    <figure className={s.figure}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={s.svg}
        role="img"
        aria-label={series
          .map((line, index) => `${line.label}, peak ${(line.format ?? format)(peaks[index])}`)
          .join(". ")}
        preserveAspectRatio="none"
      >
        {[0.25, 0.5, 0.75, 1].map((step) => (
          <line
            key={step}
            x1={pad.left}
            x2={width - pad.right}
            y1={pad.top + inner.h * (1 - step)}
            y2={pad.top + inner.h * (1 - step)}
            className={s.grid}
          />
        ))}

        {series.map((line, index) => (
          <g key={line.label} className={s.series} style={{ "--i": index } as React.CSSProperties}>
            {index === 0 && <path d={area(line.points, peaks[index])} className={s.area} />}
            <path
              d={path(line.points, peaks[index])}
              className={s.line}
              data-second={index === 1 || undefined}
            />
          </g>
        ))}
      </svg>

      <div className={s.axis} aria-hidden="true">
        {ticks.map((tick) => (
          <span
            key={tick.index}
            style={{ left: `${(tick.index / Math.max(1, count - 1)) * 100}%` }}
          >
            {tick.label}
          </span>
        ))}
      </div>

      <figcaption className={s.legend}>
        {series.map((line, index) => (
          <span key={line.label} className={s.key} data-second={index === 1 || undefined}>
            {line.label}
            <span className={s.keyPeak}>peak {(line.format ?? format)(peaks[index])}</span>
          </span>
        ))}
        <span className={s.peak}>each line scaled to its own peak</span>
      </figcaption>
    </figure>
  );
}
