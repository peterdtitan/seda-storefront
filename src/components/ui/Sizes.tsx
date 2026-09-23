"use client";

import { useRadioGroup } from "./useRadioGroup";
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
  const { setRef, onKeyDown, tabIndex } = useRadioGroup(
    options.length,
    options.findIndex((option) => option.size === value),
  );

  return (
    <div className={s.row} role="radiogroup" aria-label={label}>
      {options.map((option, index) => {
        const selected = option.size === value;
        // See Swatches: a sold-out size stays focusable so it can announce itself.
        return (
          <button
            key={option.size}
            ref={setRef(index)}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={option.soldOut || undefined}
            aria-label={option.soldOut ? `${option.size} — sold out` : option.size}
            tabIndex={tabIndex(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
            onClick={() => {
              if (!option.soldOut) onChange?.(option.size);
            }}
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
