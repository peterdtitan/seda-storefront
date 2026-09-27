"use client";

import { useId } from "react";

import s from "./catalogue.module.css";

/**
 * The form primitives. Every catalogue screen is built from these so that a field
 * behaves the same everywhere — in particular that the error message is tied to the
 * input with aria-describedby rather than merely sitting near it.
 */

type Common = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  wide?: boolean;
};

function useField(error?: string, hint?: string) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  return {
    id,
    errorId,
    hintId,
    describedBy: [hintId, errorId].filter(Boolean).join(" ") || undefined,
  };
}

function Shell({
  label,
  hint,
  error,
  required,
  wide,
  id,
  hintId,
  errorId,
  children,
}: Common & { id: string; hintId?: string; errorId?: string; children: React.ReactNode }) {
  return (
    <div className={`${s.field} ${wide ? s.wide : ""}`}>
      <label className={s.label} htmlFor={id}>
        {label}
        {required && (
          <span className={s.req} aria-hidden="true">
            {" *"}
          </span>
        )}
      </label>
      {hint && (
        <span className={s.hint} id={hintId}>
          {hint}
        </span>
      )}
      {children}
      {error && (
        <span className={s.error} id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  maxLength,
  ...rest
}: Common & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  const { id, hintId, errorId, describedBy } = useField(rest.error, rest.hint);
  return (
    <Shell {...rest} id={id} hintId={hintId} errorId={errorId}>
      <input
        id={id}
        className={s.input}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={rest.error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
    </Shell>
  );
}

export function TextArea({
  value,
  onChange,
  rows = 4,
  placeholder,
  ...rest
}: Common & {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const { id, hintId, errorId, describedBy } = useField(rest.error, rest.hint);
  return (
    <Shell {...rest} id={id} hintId={hintId} errorId={errorId}>
      <textarea
        id={id}
        className={s.textarea}
        value={value}
        rows={rows}
        placeholder={placeholder}
        aria-invalid={rest.error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
    </Shell>
  );
}

export function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  ...rest
}: Common & {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const { id, hintId, errorId, describedBy } = useField(rest.error, rest.hint);
  return (
    <Shell {...rest} id={id} hintId={hintId} errorId={errorId}>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        className={s.input}
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        step={step}
        aria-invalid={rest.error ? true : undefined}
        aria-describedby={describedBy}
        // An empty box is NaN rather than 0. Coercing to zero here means clearing the
        // field to retype a price briefly sets it to nothing, and a mis-timed save
        // publishes a free garment.
        onChange={(event) => onChange(event.target.value === "" ? NaN : Number(event.target.value))}
      />
    </Shell>
  );
}

/** Naira in, kobo out. The owner should never have to think in minor units, and the
 * schema should never store anything else. */
export function PriceField({
  kobo,
  onChange,
  ...rest
}: Common & { kobo: number; onChange: (kobo: number) => void }) {
  const { id, hintId, errorId, describedBy } = useField(rest.error, rest.hint);
  return (
    <Shell {...rest} id={id} hintId={hintId} errorId={errorId}>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        className={s.input}
        value={Number.isFinite(kobo) ? kobo / 100 : ""}
        min={0}
        step={1}
        aria-invalid={rest.error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) =>
          onChange(event.target.value === "" ? NaN : Math.round(Number(event.target.value) * 100))
        }
      />
    </Shell>
  );
}

export function SelectField({
  value,
  onChange,
  options,
  placeholder,
  ...rest
}: Common & {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const { id, hintId, errorId, describedBy } = useField(rest.error, rest.hint);
  return (
    <Shell {...rest} id={id} hintId={hintId} errorId={errorId}>
      <select
        id={id}
        className={s.select}
        value={value}
        aria-invalid={rest.error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Shell>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className={s.check}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        {label}
        {hint && <span className={s.hint}>{hint}</span>}
      </span>
    </label>
  );
}

/** A colour picker beside a text box, because the picker is how you match cloth and
 * the text box is how you paste a hex somebody sent you. */
export function HexField({
  value,
  onChange,
  ...rest
}: Common & { value: string; onChange: (value: string) => void }) {
  const { id, hintId, errorId, describedBy } = useField(rest.error, rest.hint);
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);

  return (
    <Shell {...rest} id={id} hintId={hintId} errorId={errorId}>
      <div className={s.hexRow}>
        <input
          type="color"
          className={s.swatch}
          value={valid ? value : "#000000"}
          aria-label={`${rest.label} — colour picker`}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          id={id}
          className={s.input}
          value={value}
          placeholder="#2F4F4F"
          maxLength={7}
          spellCheck={false}
          aria-invalid={rest.error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </Shell>
  );
}

/** Multi-select without a multi-select: a checkbox per option reads better on a phone
 * and does not need a modifier key nobody knows about. */
export function CheckList({
  values,
  onChange,
  options,
  max,
  ...rest
}: Common & {
  values: string[];
  onChange: (values: string[]) => void;
  options: { value: string; label: string }[];
  max?: number;
}) {
  const { errorId } = useField(rest.error, rest.hint);
  const full = max !== undefined && values.length >= max;

  return (
    <div className={`${s.field} ${rest.wide ? s.wide : ""}`}>
      <span className={s.label}>{rest.label}</span>
      {rest.hint && <span className={s.hint}>{rest.hint}</span>}
      <div>
        {options.map((option) => {
          const checked = values.includes(option.value);
          return (
            <label key={option.value} className={s.check}>
              <input
                type="checkbox"
                checked={checked}
                disabled={!checked && full}
                onChange={() =>
                  onChange(
                    checked
                      ? values.filter((value) => value !== option.value)
                      : [...values, option.value],
                  )
                }
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
      {rest.error && (
        <span className={s.error} id={errorId} role="alert">
          {rest.error}
        </span>
      )}
    </div>
  );
}
