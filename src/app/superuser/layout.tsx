import type { Metadata } from "next";

import { endSession } from "@/app/admin/actions";
import { AdminShell } from "@/components/admin/AdminShell";
import type { NavItem } from "@/lib/admin/nav";
import { requireSuperuser } from "@/lib/auth/superuser";

export const metadata: Metadata = {
  title: { default: "Superuser", template: "%s — Superuser" },
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

const LINKS: NavItem[] = [
  { href: "/superuser", label: "Platform", roles: [] },
  { href: "/superuser/accounts", label: "Accounts", roles: [] },
  { href: "/superuser/seo", label: "SEO", roles: [] },
  { href: "/admin", label: "Back to the shop admin", roles: [] },
];

/**
 * The same shell as the admin, in a darker palette.
 *
 * It used to carry its own bar with the links laid out across the top, which had no
 * answer for a narrow screen. Sharing the admin's shell means one drawer, one set of
 * focus and Escape handling, and one place to get that right — the surfaces stay
 * apart by colour, which is the distinction that matters.
 */
export default async function SuperuserLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireSuperuser();
  const { name, email, tier, roles } = actor;

  return (
    <AdminShell
      items={LINKS}
      user={{ name, email, tier, roles }}
      signOut={endSession}
      homeHref="/superuser"
      tierLabel="superuser"
      navLabel="Superuser sections"
      surface="superuser"
    >
      {children}
    </AdminShell>
  );
}
