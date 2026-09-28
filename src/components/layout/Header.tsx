"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CartIcon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/Logo";
import { useCart } from "@/lib/cart/CartProvider";

import s from "./Header.module.css";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/lookbook", label: "Lookbook" },
  { href: "/story", label: "Story" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const { count } = useCart();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDialogElement>(null);

  // "/" is an exact match. startsWith would make Home the current page everywhere,
  // since every path begins with a slash.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const linkClass = (href: string) =>
    [s.link, isActive(href) ? s.active : ""].filter(Boolean).join(" ");

  /**
   * A real dialog, unlike the admin's drawer.
   *
   * The admin's is the permanent sidebar on a wide screen and a dialog cannot be both
   * modal and part of the layout. This one only ever exists on a phone, so showModal
   * can do the work by hand: it traps focus, it makes the rest of the page inert, and
   * Escape closes it without a key listener.
   */
  useEffect(() => {
    const node = drawer.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  // Navigating is the end of the drawer's job. Adjusted during render rather than in
  // an effect, which would show the open drawer for one committed frame before
  // closing it — and this also catches the back button, which a click handler
  // on the links would not.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  const close = () => {
    setOpen(false);
    menuButton.current?.focus();
  };

  // Read out in full, because the icon says nothing on its own and "Bag 2" would be
  // announced as two unrelated words.
  const bagLabel = `Bag, ${count} ${count === 1 ? "item" : "items"}`;

  const bag = (
    <Link
      href="/bag"
      className={[s.link, s.bag, isActive("/bag") ? s.active : ""].filter(Boolean).join(" ")}
      aria-label={bagLabel}
    >
      <CartIcon />
      <span className={s.count} aria-hidden="true">
        {count}
      </span>
    </Link>
  );

  return (
    <header className={s.header}>
      <a href="#main" className={s.skip}>
        Skip to content
      </a>

      <div className={s.desktop}>
        <nav className={s.nav} aria-label="Primary">
          {NAV.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={linkClass(item.href)}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href="/" className={s.wordmark} aria-label="Șèdá — home">
          <Logo height={22} />
        </Link>

        <div className={s.actions}>
          <Link href="/contact" className={linkClass("/contact")}>
            Contact
          </Link>
          {bag}
        </div>
      </div>

      <div className={s.mobile}>
        {/* Menu first, then the mark. Where people reach for it. */}
        <button
          type="button"
          ref={menuButton}
          className={s.menuButton}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          <span className={s.burger} aria-hidden="true" />
        </button>

        <Link href="/" className={s.mobileWordmark} aria-label="Șèdá — home">
          <Logo height={16} />
        </Link>

        {bag}
      </div>

      <dialog
        ref={drawer}
        className={s.drawer}
        aria-label="Primary"
        // Fires on Escape and on the backdrop's own close, so state follows the
        // element rather than the element following state.
        onClose={() => setOpen(false)}
        // The backdrop is part of the dialog, so a tap outside lands here.
        onClick={(event) => {
          if (event.target === drawer.current) close();
        }}
      >
        <div className={s.drawerInner}>
          <div className={s.drawerHead}>
            <Logo height={16} />
            <button type="button" className={s.close} onClick={close}>
              Close
            </button>
          </div>

          <nav className={s.drawerNav}>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={[s.drawerLink, isActive(item.href) ? s.active : ""]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </dialog>
    </header>
  );
}
