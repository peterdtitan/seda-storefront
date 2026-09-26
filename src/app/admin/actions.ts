"use server";

import { signOut } from "@/auth";

export async function endSession() {
  // Deletes the session row through the adapter, not just the cookie, so the same
  // token cannot be replayed from somewhere the cookie was copied to.
  await signOut({ redirectTo: "/admin/sign-in" });
}
