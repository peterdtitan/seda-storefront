/**
 * Inline rather than a sprite or a dependency: there are very few of these, and an
 * icon that inherits currentColor and scales with the text needs no build step.
 */

export function CartIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      // Decorative: the link around it carries the accessible name, so announcing
      // this too would read the bag out twice.
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 7h12l-1.2 12.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 7Z" />
      <path d="M9 7V5.5a3 3 0 0 1 6 0V7" />
    </svg>
  );
}
