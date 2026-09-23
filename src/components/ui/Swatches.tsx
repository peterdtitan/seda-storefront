"use client";

import { useRadioGroup } from "./useRadioGroup";
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
  const { setRef, onKeyDown, tabIndex } = useRadioGroup(
    options.length,
    options.findIndex((option) => option.slug === value),
  );

  return (
    <div className={s.row} role="radiogroup" aria-label={label}>
      {options.map((option, index) => {
        const selected = option.slug === value;
        // aria-disabled rather than disabled: a disabled button leaves the tab order
        // and the group, so a sold-out colour becomes undiscoverable by keyboard.
        const blocked = disableSoldOut && option.soldOut === true;
        return (
          <span key={option.slug} className={s.hit}>
            <button
              ref={setRef(index)}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={blocked || undefined}
              aria-label={option.soldOut ? `${option.name} — sold out` : option.name}
              tabIndex={tabIndex(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
              onClick={() => {
                if (!blocked) onChange?.(option.slug);
              }}
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
