import "server-only";

import { redirect } from "next/navigation";

import { currentActor, type Actor } from "./permissions";

/**
 * The superuser gate.
 *
 * Deliberately not a permission. Permissions describe what a role in the shop can do;
 * this is a different tier of account with a surface of its own, and folding it into
 * the same table would put it one bad grant away from being handed to a staff member.
 */
export async function requireSuperuser(): Promise<Actor> {
  const actor = await currentActor();
  if (!actor) redirect("/admin/sign-in");
  // A 404 rather than a refusal: an owner poking at /superuser learns nothing about
  // whether the surface exists.
  if (actor.tier !== "superuser") redirect("/admin/no-access?need=superuser");
  return actor;
}
