"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CartIcon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/Logo";
import { useCart } from "@/lib/cart/CartProvider";

import s from "./Header.module.css";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/lookbook", label: "Lookbook" },
  { href: "/story", label: "Story" },
];

// The mobile bar had no links at all — the marks went home and everything else was
// reached from the footer. Home is listed first because that was the thing nobody
// could find; Contact comes along because a row with a gap in it reads as a mistake.
const MOBILE_NAV = [...NAV, { href: "/contact", label: "Contact" }];

export function Header() {
  const { count } = useCart();
  const pathname = usePathname();

  // "/" is an exact match. startsWith would make Home the current page everywhere,
  // since every path begins with a slash.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const linkClass = (href: string) =>
    [s.link, isActive(href) ? s.active : ""].filter(Boolean).join(" ");

  // Read out in full, because the icon says nothing on its own and "Bag 2" would be
  // announced as two unrelated words.
  const bagLabel = `Bag, ${count} ${count === 1 ? "item" : "items"}`;

  return (
    <header className={s.header}>
      <a href="#main" className={s.skip}>
        Skip to content
      </a>

      <div className={s.desktop}>
        <nav className={s.nav} aria-label="Primary">
          {NAV.map((item) => (
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
        </div>
      </div>

      <div className={s.mobile}>
        <div className={s.mobileBar}>
          <Link href="/" className={s.mobileMark} aria-label="Șèdá — home">
            <Logo kind="mark" height={22} alt="" />
          </Link>
          <Link href="/" className={s.mobileWordmark} aria-hidden="true" tabIndex={-1}>
            <Logo height={15} />
          </Link>
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
        </div>

        {/* Scrolls sideways rather than wrapping: a second row of links pushes the
            whole shop below the fold on a short phone. */}
        <nav className={s.mobileNav} aria-label="Primary">
          {MOBILE_NAV.map((item) => (
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
      </div>
    </header>
  );
}
