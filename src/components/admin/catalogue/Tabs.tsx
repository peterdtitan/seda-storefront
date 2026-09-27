"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import s from "./catalogue.module.css";

const TABS = [
  { href: "/admin/catalogue", label: "Products" },
  { href: "/admin/catalogue/looks", label: "Lookbook" },
  { href: "/admin/catalogue/categories", label: "Categories" },
  { href: "/admin/catalogue/content", label: "Site content" },
];

export function Tabs() {
  const pathname = usePathname();

  // Longest match wins, so /catalogue/looks/abc marks Lookbook rather than Products —
  // which would otherwise match every path under /catalogue.
  const current = TABS.filter(
    (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <nav className={s.tabs} aria-label="Catalogue sections">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={s.tab}
          aria-current={current?.href === tab.href ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
