import type { Metadata } from "next";

import { listAllAccounts } from "@/lib/admin/staff";
import { requireSuperuser } from "@/lib/auth/superuser";

import { AccountRow } from "./AccountRow";
import s from "./accounts.module.css";
import panels from "../panels.module.css";

export const metadata: Metadata = { title: "Accounts" };

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const actor = await requireSuperuser();
  const accounts = await listAllAccounts();

  const supers = accounts.filter((a) => a.tier === "superuser");
  const staff = accounts.filter((a) => a.tier === "staff");

  return (
    <>
      <h1 className={panels.title}>Accounts</h1>
      <p className={panels.lede}>
        Everyone, both tiers. The shop admin&rsquo;s own staff screen filters this list to staff,
        which is the only reason the superuser tier stays off it.
      </p>

      <section className={panels.panel}>
        <div className={panels.panelHead}>
          <h2 className={panels.panelTitle}>Superusers</h2>
          <span className={panels.count}>{supers.length}</span>
        </div>
        <ul className={s.list}>
          {supers.map((account) => (
            <AccountRow key={account.id} account={account} isYou={account.id === actor.id} />
          ))}
        </ul>
      </section>

      <section className={panels.panel}>
        <div className={panels.panelHead}>
          <h2 className={panels.panelTitle}>Staff</h2>
          <span className={panels.count}>{staff.length}</span>
        </div>
        {staff.length === 0 ? (
          <p className={panels.quiet}>Nobody yet.</p>
        ) : (
          <ul className={s.list}>
            {staff.map((account) => (
              <AccountRow key={account.id} account={account} isYou={account.id === actor.id} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
