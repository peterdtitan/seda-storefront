import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

import type { Role, Tier } from "./store";

/** Capabilities, not screens. A screen can need more than one, and two screens can
 * need the same one — mapping roles straight to routes gets that wrong the first time
 * a page shows something from two places. */
export type Permission =
  | "orders.read"
  | "orders.fulfil"
  | "payments.read"
  | "refunds.read"
  | "refunds.write"
  | "payouts.read"
  | "payouts.request"
  | "analytics.read"
  | "catalogue.write"
  | "staff.manage";

const BY_ROLE: Record<Role, Permission[]> = {
  content: ["catalogue.write", "analytics.read"],
  refunds: ["orders.read", "refunds.read", "refunds.write"],
  delivery: ["orders.read", "orders.fulfil"],
  // Read-only across orders, payments and payouts. Money is visible to finance and
  // moved by an owner; the two are not the same job.
  finance: ["orders.read", "payments.read", "refunds.read", "payouts.read", "analytics.read"],
  owner: [
    "orders.read",
    "orders.fulfil",
    "payments.read",
    "refunds.read",
    "refunds.write",
    "payouts.read",
    "payouts.request",
    "analytics.read",
    "catalogue.write",
    "staff.manage",
  ],
};

export function permissionsFor(roles: Role[], tier: Tier): Set<Permission> {
  if (tier === "superuser") return new Set(Object.values(BY_ROLE).flat());
  return new Set(roles.flatMap((role) => BY_ROLE[role] ?? []));
}

export function can(roles: Role[], tier: Tier, permission: Permission): boolean {
  return permissionsFor(roles, tier).has(permission);
}

export type Actor = {
  id: string;
  email: string;
  name: string | null;
  roles: Role[];
  tier: Tier;
  can: (permission: Permission) => boolean;
};

/**
 * The gate every page and every action goes through.
 *
 * Hiding a link in the nav is not authorisation — it only keeps the panel honest about
 * what a role is for. Nothing reads an order, moves a fulfilment or touches money
 * without coming through here first.
 */
export async function requirePermission(permission: Permission): Promise<Actor> {
  const actor = await currentActor();
  if (!actor) redirect("/admin/sign-in");
  if (!actor.can(permission)) redirect(`/admin/no-access?need=${permission}`);
  return actor;
}

/** Wrapped in React's cache so the layout, the page and every guard inside one render
 * share a single session read. Without it, auth() runs once per caller and each one is
 * its own trip to Neon. */
export const currentActor = cache(async (): Promise<Actor | null> => {
  const session = await auth();
  if (!session?.user) return null;

  const { id, email, name, roles, tier } = session.user;
  const held = permissionsFor(roles, tier);

  return {
    id,
    email,
    name: name ?? null,
    roles,
    tier,
    can: (permission) => held.has(permission),
  };
});
