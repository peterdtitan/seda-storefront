import type { Metadata } from "next";

import { listStaff } from "@/lib/admin/staff";
import { currentActor, requirePermission } from "@/lib/auth/permissions";

import { InviteForm } from "./InviteForm";
import { StaffCard } from "./StaffRow";
import s from "./staff.module.css";

export const metadata: Metadata = { title: "Staff" };

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  await requirePermission("staff.manage");
  const [people, actor] = await Promise.all([listStaff(), currentActor()]);

  return (
    <>
      <div className={s.head}>
        <h1 className={s.title}>Staff</h1>
        <p className={s.lede}>
          {/* No invitation email is sent. Adding someone only makes the address one
              the sign-in form will answer to; they still request their own link. */}
          Adding someone lets them sign in — they request their own link, so nothing is emailed from
          here.
        </p>
      </div>

      <section className={s.card} aria-labelledby="people">
        <h2 id="people" className={s.cardTitle}>
          {people.length} {people.length === 1 ? "person" : "people"}
        </h2>
        <ul className={s.people}>
          {people.map((person) => (
            <StaffCard key={person.id} person={person} isYou={person.id === actor?.id} />
          ))}
        </ul>
      </section>

      <section className={s.card} aria-labelledby="add">
        <h2 id="add" className={s.cardTitle}>
          Add someone
        </h2>
        <InviteForm />
      </section>
    </>
  );
}
