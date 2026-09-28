import Image from "next/image";

import s from "./PoweredBy.module.css";

const RATIO = 86 / 96;

/**
 * The build credit.
 *
 * Two tones rather than one file, because the mark is a dark purple that disappears
 * against the ink footer. The cream version is recoloured from the same artwork's
 * alpha, which is how the supplied light variant was made.
 *
 * `href` is deliberately empty until elev8r has a public address — a credit that
 * links nowhere is better than one that links to a 404.
 */
const SITE = "";

export function PoweredBy({
  tone = "ink",
  className,
}: {
  tone?: "ink" | "cream";
  className?: string;
}) {
  const height = 14;

  const body = (
    <>
      <Image
        src={`/elev8r/mark-${tone}.png`}
        alt=""
        height={height}
        width={Math.round(height * RATIO)}
        className={s.mark}
      />
      <span>
        Powered by <span className={s.name}>elev8r</span>
      </span>
    </>
  );

  const classes = [s.credit, className].filter(Boolean).join(" ");

  if (!SITE) {
    return (
      <span className={classes} data-tone={tone}>
        {body}
      </span>
    );
  }

  return (
    <a className={classes} data-tone={tone} href={SITE} target="_blank" rel="noreferrer">
      {body}
    </a>
  );
}
