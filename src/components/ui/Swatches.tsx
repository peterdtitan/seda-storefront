"use client";

import s from "./Swatches.module.css";

export type SwatchOption = {
  name: string;
  slug: string;
  swatch: string;
  soldOut?: boolean;
};

export function Swatches({
  options,
  value,
  onChange,
  size,
  label = "Colour",
  disableSoldOut = true,
}: {
  options: SwatchOption[];
  value: string;
  onChange?: (slug: string) => void;
  size?: number;
  label?: string;
  /** A sold-out colour is still worth looking at, so the product page keeps it clickable. */
  disableSoldOut?: boolean;
}) {
  return (
    <div className={s.row} role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const selected = option.slug === value;
        return (
          <span key={option.slug} className={s.hit}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={option.soldOut ? `${option.name} — sold out` : option.name}
              disabled={disableSoldOut && option.soldOut}
              onClick={() => onChange?.(option.slug)}
              className={[s.swatch, selected ? s.selected : "", option.soldOut ? s.soldOut : ""]
                .filter(Boolean)
                .join(" ")}
              style={{
                background: option.swatch,
                ...(size ? { ["--swatch-size" as string]: `${size}px` } : {}),
              }}
            />
          </span>
        );
      })}
    </div>
  );
}
