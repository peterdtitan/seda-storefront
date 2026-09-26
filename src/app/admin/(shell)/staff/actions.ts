"use server";

import { revalidatePath } from "next/cache";

import { invalidate, TAGS } from "@/lib/admin/cache";

import { ROLES } from "@/lib/admin/roles";
import { endSessionsFor, inviteStaff, setRoles, setStatus } from "@/lib/admin/staff";
import { requirePermission } from "@/lib/auth/permissions";
import type { Role } from "@/lib/auth/store";

export type StaffState =
  { status: "idle" } | { status: "done"; message: string } | { status: "error"; message: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function rolesFrom(formData: FormData): Role[] {
  return formData
    .getAll("roles")
    .map(String)
    .filter((role): role is Role => ROLES.includes(role as Role));
}

export async function invite(_previous: StaffState, formData: FormData): Promise<StaffState> {
  const actor = await requirePermission("staff.manage");

  const email = String(formData.get("email") ?? "")
    .trim()
    .slice(0, 254);
  const name =
    String(formData.get("name") ?? "")
      .trim()
      .slice(0, 120) || null;
  const roles = rolesFrom(formData);

  if (!EMAIL.test(email)) return { status: "error", message: "That is not an email address." };
  if (roles.length === 0) {
    return { status: "error", message: "Give them at least one role, or they can reach nothing." };
  }

  const result = await inviteStaff({ email, name, roles, by: actor });
  if (!result.ok) return { status: "error", message: result.message };

  invalidate(TAGS.staff);
  revalidatePath("/admin/staff");
  return {
    status: "done",
    message: result.created
      ? `${email} can now sign in. There is nothing to send them — they request their own link.`
      : `${email} already had an account. Roles added.`,
  };
}

export async function updateRoles(_previous: StaffState, formData: FormData): Promise<StaffState> {
  const actor = await requirePermission("staff.manage");

  const userId = String(formData.get("userId") ?? "");
  const result = await setRoles({ userId, roles: rolesFrom(formData), by: actor });
  if (!result.ok) return { status: "error", message: result.message };

  invalidate(TAGS.staff);
  revalidatePath("/admin/staff");
  return { status: "done", message: "Saved." };
}

export async function toggleStatus(_previous: StaffState, formData: FormData): Promise<StaffState> {
  await requirePermission("staff.manage");

  const userId = String(formData.get("userId") ?? "");
  const next = String(formData.get("next") ?? "") === "suspended" ? "suspended" : "active";

  const result = await setStatus({ userId, status: next });
  if (!result.ok) return { status: "error", message: result.message };

  invalidate(TAGS.staff);
  revalidatePath("/admin/staff");
  return {
    status: "done",
    message: next === "suspended" ? "Suspended and signed out everywhere." : "Back in.",
  };
}

export async function signOutEverywhere(
  _previous: StaffState,
  formData: FormData,
): Promise<StaffState> {
  await requirePermission("staff.manage");

  const killed = await endSessionsFor(String(formData.get("userId") ?? ""));
  invalidate(TAGS.staff);
  revalidatePath("/admin/staff");
  return {
    status: "done",
    message: killed === 0 ? "They had no sessions open." : `Ended ${killed}.`,
  };
}
