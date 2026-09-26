"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { activeHref, type NavItem } from "@/lib/admin/nav";
import type { Role, Tier } from "@/lib/auth/store";

import s from "./adminShell.module.css";

export type ShellUser = {
  name: string | null;
  email: string;
  tier: Tier;
  roles: Role[];
};

export function AdminShell({
  items,
  user,
  signOut,
  children,
}: {
  items: NavItem[];
  user: ShellUser;
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);

  const current = activeHref(pathname, items);

  // The drawer only exists below the sidebar breakpoint — the button that opens it is
  // display:none above, which takes it out of the tab order too. So `open` being true
  // is itself the signal that we are on a narrow screen.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    // Focus moves into the drawer rather than staying on a button the overlay covers.
    drawer.current?.querySelector<HTMLElement>("a, button")?.focus();

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Navigating is the end of the drawer's job — otherwise it sits open over the page
  // the person just asked for. Adjusted during render rather than in an effect: an
  // effect here sets state on a pass that has already been committed, which renders
  // the open drawer once before closing it. This also catches a back button, which a
  // click handler on the links would not.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  const close = () => {
    setOpen(false);
    menuButton.current?.focus();
  };

  return (
    <div className={s.shell} data-open={open || undefined}>
      <header className={s.bar}>
        <button
          type="button"
          ref={menuButton}
          className={s.menuButton}
          aria-expanded={open}
          aria-controls="admin-nav"
          onClick={() => setOpen((was) => !was)}
        >
          <span className={s.burger} aria-hidden="true" />
          {open ? "Close" : "Menu"}
        </button>

        <Link href="/admin" className={s.mark}>
          ȘÈDÁ
        </Link>

        <span className={s.barTier}>{user.tier === "superuser" ? "superuser" : "admin"}</span>
      </header>

      {/* Not a <dialog>: the same element is the permanent sidebar on a wide screen,
          and a dialog cannot be both modal and part of the layout. Closed on a narrow
          screen it is visibility:hidden rather than merely translated away, which is
          what keeps a keyboard from tabbing into links nobody can see. */}
      <aside id="admin-nav" ref={drawer} className={s.sidebar} aria-label="Admin sections">
        {/* The open drawer sits over the bar, so the button that opened it is no longer
            reachable. The scrim and Escape both close it, but neither is obvious on a
            phone. */}
        <div className={s.drawerHead}>
          <Link href="/admin" className={s.drawerMark}>
            ȘÈDÁ
          </Link>
          <button type="button" className={s.closeButton} onClick={close}>
            Close
          </button>
        </div>

        <Link href="/admin" className={s.sidebarMark}>
          ȘÈDÁ
        </Link>

        <nav className={s.nav}>
          <ul className={s.navList}>
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={s.navLink}
                  aria-current={current === item.href ? "page" : undefined}
                  {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  {item.label}
                  {item.external && (
                    <span className={s.navExternal} aria-label="(opens in a new tab)">
                      ↗
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={s.who}>
          <span className={s.whoName}>{user.name ?? user.email}</span>
          <span className={s.whoRoles}>
            {user.tier === "superuser" ? "superuser" : user.roles.join(", ") || "no roles yet"}
          </span>
          <form action={signOut}>
            <button type="submit" className={s.signOut}>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Covers the page while the drawer is open, and closes it on a tap outside. */}
      <button type="button" className={s.scrim} tabIndex={-1} aria-hidden="true" onClick={close} />

      {/* Keyed by pathname so the entrance replays on each navigation. Without the
          key React reuses the element and the animation only ever runs once. */}
      <main key={pathname} id="admin-main" className={s.main} inert={open || undefined}>
        {children}
      </main>
    </div>
  );
}
