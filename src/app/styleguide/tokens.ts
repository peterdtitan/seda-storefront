/**
 * The token names rendered by /styleguide. Kept as data so adding a token to
 * src/styles/tokens/ and forgetting to surface it here is a one-line fix, not a
 * JSX edit.
 */

export const coreColours = [
  "--seda-oxblood",
  "--seda-oxblood-deep",
  "--seda-oxblood-lift",
  "--seda-ink",
  "--seda-ink-deep",
  "--seda-ink-lift",
  "--seda-cream",
  "--seda-shell",
  "--seda-black",
];

export const neutrals = [
  "--seda-n-50",
  "--seda-n-100",
  "--seda-n-200",
  "--seda-n-300",
  "--seda-n-400",
  "--seda-n-500",
  "--seda-n-600",
  "--seda-n-700",
  "--seda-n-800",
  "--seda-n-900",
];

export const accents = [
  "--seda-indigo",
  "--seda-indigo-pale",
  "--seda-crimson",
  "--seda-terracotta",
  "--seda-ochre",
  "--seda-clay",
  "--seda-rose",
  "--seda-teal",
  "--seda-olive",
  "--seda-aubergine",
];

export const semanticColours = [
  "--surface-page",
  "--surface-page-alt",
  "--surface-card",
  "--surface-sunken",
  "--surface-inverse",
  "--surface-inverse-alt",
  "--surface-overlay",
  "--text-body",
  "--text-heading",
  "--text-muted",
  "--text-subtle",
  "--text-link",
  "--text-link-hover",
  "--border-hairline",
  "--border-strong",
  "--action-primary-bg",
  "--action-primary-bg-hover",
  "--action-primary-bg-active",
  "--action-disabled-bg",
  "--focus-ring",
  "--status-success",
  "--status-warning",
  "--status-danger",
  "--status-info",
  "--status-soldout",
];

/** Composed `font:` shorthand roles. Value doubles as the specimen style. */
export const typeRoles = [
  "--type-hero",
  "--type-display",
  "--type-h1",
  "--type-h2",
  "--type-h3",
  "--type-h4",
  "--type-brand-lead",
  "--type-brand-body",
  "--type-body",
  "--type-body-sm",
  "--type-label",
  "--type-eyebrow",
  "--type-caption",
];

export const fontSizes = [
  ["--fs-3xs", "11px"],
  ["--fs-2xs", "12px"],
  ["--fs-xs", "13px"],
  ["--fs-sm", "15px"],
  ["--fs-md", "17px"],
  ["--fs-lg", "20px"],
  ["--fs-xl", "25px"],
  ["--fs-2xl", "32px"],
  ["--fs-3xl", "42px"],
  ["--fs-4xl", "56px"],
  ["--fs-5xl", "76px"],
  ["--fs-6xl", "104px"],
] as const;

export const spacing = [
  ["--space-1", "4px"],
  ["--space-2", "8px"],
  ["--space-3", "12px"],
  ["--space-4", "16px"],
  ["--space-5", "20px"],
  ["--space-6", "24px"],
  ["--space-8", "32px"],
  ["--space-10", "40px"],
  ["--space-12", "48px"],
  ["--space-16", "64px"],
  ["--space-20", "80px"],
  ["--space-24", "96px"],
  ["--space-32", "128px"],
] as const;

export const radii = [
  ["--radius-none", "0"],
  ["--radius-xs", "2px"],
  ["--radius-sm", "3px"],
  ["--radius-md", "4px"],
  ["--radius-callout", "28px"],
  ["--radius-pill", "999px"],
] as const;

export const shadows = [
  "--shadow-hairline",
  "--shadow-raise",
  "--shadow-menu",
  "--shadow-modal",
  "--shadow-inset-well",
] as const;

export const scrims = [
  "--scrim-bottom",
  "--scrim-left",
  "--scrim-full",
  "--scrim-oxblood",
  "--scrim-ink",
] as const;

export const durations = [
  ["--dur-instant", "80ms"],
  ["--dur-fast", "140ms"],
  ["--dur-base", "220ms"],
  ["--dur-slow", "380ms"],
  ["--dur-reveal", "640ms"],
  ["--dur-drape", "900ms"],
] as const;

export const easings = [
  ["--ease-out", "cubic-bezier(.22,.61,.36,1)"],
  ["--ease-in-out", "cubic-bezier(.45,.05,.55,.95)"],
  ["--ease-drape", "cubic-bezier(.16,.84,.24,1)"],
  ["--ease-linear", "linear"],
] as const;
