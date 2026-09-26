import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { navFor } from "@/lib/admin/nav";
import { currentActor } from "@/lib/auth/permissions";

import { endSession } from "../actions";

export const dynamic = "force-dynamic";

/**
 * The gate. Auth.js keeps sessions in Postgres, which the Edge runtime cannot reach,
 * so middleware does hostname routing only and the check lives here — one place, on
 * the server, for every page inside the group.
 */
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  // currentActor is React-cached, so this and every guard on the page inside it
  // share one session read rather than each making their own.
  const actor = await currentActor();
  if (!actor) redirect("/admin/sign-in");

  const { name, email, tier, roles } = actor;

  return (
    <AdminShell
      items={navFor(roles, tier)}
      user={{ name, email, tier, roles }}
      signOut={endSession}
    >
      {children}
    </AdminShell>
  );
}
