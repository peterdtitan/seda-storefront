"use client";

import s from "./Sizes.module.css";

export type SizeOption = { size: string; soldOut?: boolean };

export function Sizes({
  options,
  value,
  onChange,
  compact,
  label = "Size",
}: {
  options: SizeOption[];
  value?: string;
  onChange?: (size: string) => void;
  compact?: boolean;
  label?: string;
}) {
  return (
    <div className={s.row} role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const selected = option.size === value;
        return (
          <button
            key={option.size}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.soldOut ? `${option.size} — sold out` : option.size}
            disabled={option.soldOut}
            onClick={() => onChange?.(option.size)}
            className={[
              s.size,
              compact ? s.compact : "",
              selected ? s.selected : "",
              option.soldOut ? s.soldOut : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {option.size}
          </button>
        );
      })}
    </div>
  );
}
