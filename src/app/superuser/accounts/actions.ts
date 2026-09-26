"use server";

import { revalidatePath } from "next/cache";

import { ROLES } from "@/lib/admin/roles";
import { endSessionsFor, forceRoles, setTier } from "@/lib/admin/staff";
import { requireSuperuser } from "@/lib/auth/superuser";
import type { Role } from "@/lib/auth/store";

export type AccountState =
  { status: "idle" } | { status: "done"; message: string } | { status: "error"; message: string };

function refresh() {
  revalidatePath("/superuser/accounts");
  revalidatePath("/superuser");
  revalidatePath("/admin/staff");
}

export async function grantRoles(
  _previous: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const actor = await requireSuperuser();

  const userId = String(formData.get("userId") ?? "");
  const roles = formData
    .getAll("roles")
    .map(String)
    .filter((role): role is Role => ROLES.includes(role as Role));

  await forceRoles({ userId, roles, by: { id: actor.id } });
  refresh();
  return {
    status: "done",
    message: roles.length ? `Now ${roles.join(", ")}.` : "All roles removed.",
  };
}

export async function changeTier(
  _previous: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const actor = await requireSuperuser();

  const userId = String(formData.get("userId") ?? "");
  const tier = String(formData.get("tier") ?? "") === "superuser" ? "superuser" : "staff";

  // Demoting yourself mid-session would leave you on a page you can no longer load.
  if (userId === actor.id && tier === "staff") {
    return { status: "error", message: "Demote yourself from another superuser account." };
  }

  const result = await setTier({ userId, tier });
  if (!result.ok) return { status: "error", message: result.message };

  refresh();
  return { status: "done", message: `Moved to ${tier}.` };
}

export async function killSessions(
  _previous: AccountState,
  formData: FormData,
): Promise<AccountState> {
  await requireSuperuser();
  const killed = await endSessionsFor(String(formData.get("userId") ?? ""));
  refresh();
  return { status: "done", message: killed === 0 ? "None were open." : `Ended ${killed}.` };
}
