import type { Role } from "@/lib/auth/store";

/** The role vocabulary, with no server imports.
 *
 * Kept apart from the queries in staff.ts for the same reason orderStatus.ts is kept
 * apart from orders.ts: the forms that render these are client components, and
 * importing them from a module that reaches the database drags the Postgres driver
 * into the browser bundle. It fails at build, but only after the page exists.
 */
export const ROLES: Role[] = ["content", "refunds", "delivery", "finance", "owner"];

export const ROLE_BLURB: Record<Role, string> = {
  content: "Catalogue, copy, lookbook and imagery. Sees analytics.",
  refunds: "Refund requests and returns, and the orders behind them.",
  delivery: "Fulfilment and shipping status. Moves orders and emails customers.",
  finance: "Read-only across orders, payments, refunds and payouts.",
  owner: "All of the above, plus inviting people and requesting a payout.",
};

export type StaffRow = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  roles: Role[];
  createdAt: Date;
  lastSeenAt: Date | null;
  sessions: number;
};

export type AnyAccount = StaffRow & { tier: string };
