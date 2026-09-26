import type { Metadata } from "next";
import Link from "next/link";

import { endSession } from "@/app/admin/actions";
import { requireSuperuser } from "@/lib/auth/superuser";

import s from "./superuser.module.css";

export const metadata: Metadata = {
  title: { default: "Superuser", template: "%s — Superuser" },
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/superuser", label: "Platform" },
  { href: "/superuser/accounts", label: "Accounts" },
  { href: "/superuser/seo", label: "SEO" },
  { href: "/admin", label: "Back to the shop admin" },
];

export default async function SuperuserLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireSuperuser();

  return (
    // Ink rather than oxblood, everywhere. This surface can revoke an owner, and it
    // should never be mistaken for the screen next door.
    <div className={s.shell} data-theme="ink">
      <header className={s.bar}>
        <span className={s.mark}>ȘÈDÁ</span>
        <span className={s.tier}>superuser</span>

        <nav className={s.nav} aria-label="Superuser sections">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={s.navLink}>
              {link.label}
            </Link>
          ))}
        </nav>

        <form action={endSession} className={s.out}>
          <span className={s.who}>{actor.email}</span>
          <button type="submit" className={s.signOut}>
            Sign out
          </button>
        </form>
      </header>

      <main className={s.main}>{children}</main>
    </div>
  );
}
