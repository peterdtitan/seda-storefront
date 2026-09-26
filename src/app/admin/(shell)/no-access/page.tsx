import type { Metadata } from "next";
import Link from "next/link";

import { currentActor } from "@/lib/auth/permissions";

import s from "./noAccess.module.css";

export const metadata: Metadata = { title: "No access" };

export const dynamic = "force-dynamic";

export default async function NoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ need?: string }>;
}) {
  const [{ need }, actor] = await Promise.all([searchParams, currentActor()]);

  return (
    <div className={s.panel}>
      <h1 className={s.title}>Not your part of the shop</h1>
      {/* Says which permission was missing rather than a flat refusal. A colleague
          asking an owner for access can then name the thing they need. */}
      <p className={s.body}>
        That screen needs <code className={s.code}>{need ?? "a permission"}</code>, and your account
        does not have it. Ask an owner if you think it should.
      </p>
      <p className={s.body}>
        You are signed in as {actor?.email ?? "someone"}
        {actor?.roles.length ? ` with ${actor.roles.join(", ")}` : " with no roles yet"}.
      </p>
      <Link href="/admin" className={s.back}>
        Back to the dashboard
      </Link>
    </div>
  );
}
