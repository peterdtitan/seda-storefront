"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/ui/Logo";
import { useCart } from "@/lib/cart/CartProvider";

import s from "./Header.module.css";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/lookbook", label: "Lookbook" },
  { href: "/story", label: "Story" },
];

export function Header() {
  const { count } = useCart();
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

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
              className={[s.link, isActive(item.href) ? s.active : ""].filter(Boolean).join(" ")}
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
          <Link
            href="/contact"
            className={[s.link, isActive("/contact") ? s.active : ""].filter(Boolean).join(" ")}
          >
            Contact
          </Link>
          <Link
            href="/bag"
            className={[s.link, isActive("/bag") ? s.active : ""].filter(Boolean).join(" ")}
          >
            Bag ({count})
          </Link>
        </div>
      </div>

      <div className={s.mobile}>
        <Link href="/" className={s.mobileMark} aria-label="Șèdá — home">
          <Logo kind="mark" height={22} alt="" />
        </Link>
        <Link href="/" className={s.mobileWordmark} aria-hidden="true" tabIndex={-1}>
          <Logo height={15} />
        </Link>
        <Link href="/bag" className={s.link}>
          Bag {count}
        </Link>
      </div>
    </header>
  );
}
