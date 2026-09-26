import type { Role, Tier } from "@/lib/auth/store";

export type NavItem = {
  href: string;
  label: string;
  /** Roles that may see it. An owner sees everything without being listed. */
  roles: Role[];
  /** Leaves the panel — Sanity has its own session and its own login. */
  external?: boolean;
};

export const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", roles: ["content", "refunds", "delivery", "finance"] },
  { href: "/admin/orders", label: "Orders", roles: ["refunds", "delivery", "finance"] },
  { href: "/admin/fulfilment", label: "Fulfilment", roles: ["delivery"] },
  { href: "/admin/payments", label: "Payments", roles: ["finance"] },
  { href: "/admin/refunds", label: "Refunds", roles: ["refunds", "finance"] },
  { href: "/admin/analytics", label: "Analytics", roles: ["content", "finance"] },
  { href: "/admin/payouts", label: "Payouts", roles: [] },
  { href: "/admin/staff", label: "Staff", roles: [] },
  { href: "/studio", label: "Catalogue", roles: ["content"], external: true },
];

const SUPERUSER_ITEM: NavItem = { href: "/superuser", label: "Platform", roles: [] };

/**
 * What this person should see in the nav.
 *
 * Hiding a link is not authorisation — it only keeps the panel honest about what a
 * role is for. Every page and action re-checks server side.
 */
export function navFor(roles: Role[], tier: Tier): NavItem[] {
  // The way back to the other surface, and the only place it is advertised.
  if (tier === "superuser") return [...NAV, SUPERUSER_ITEM];
  if (roles.includes("owner")) return NAV;
  return NAV.filter((item) => item.roles.some((role) => roles.includes(role)));
}

/** Marks the current section. Longest match wins, so /admin/orders/123 lights up
 * Orders rather than Dashboard, which would otherwise match every path. */
export function activeHref(pathname: string, items: NavItem[]): string | null {
  const matches = items
    .filter((item) => !item.external)
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length);

  return matches[0]?.href ?? null;
}
