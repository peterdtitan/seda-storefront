import Link from "next/link";

import { Cta } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { BrandBody } from "@/components/ui/Text";

import s from "./Footer.module.css";

const COLUMNS = [
  {
    heading: "Shop",
    items: [
      { label: "Bottoms", href: "/shop?category=bottoms" },
      { label: "Tops", href: "/shop?category=tops" },
      { label: "Sets", href: "/shop?category=sets" },
      { label: "Outerwear", href: "/shop?category=outerwear" },
    ],
  },
  {
    heading: "Studio",
    items: [
      { label: "Our Story", href: "/story" },
      { label: "Process", href: "/story#process" },
      { label: "Stockists", href: "/contact" },
    ],
  },
  {
    heading: "Help",
    items: [
      { label: "Shipping", href: "/contact" },
      { label: "Returns", href: "/contact" },
      { label: "Size guide", href: "/contact" },
    ],
  },
];

export function Footer({ tagline }: { tagline: string }) {
  return (
    <footer className={s.footer} data-theme="ink">
      <div className={s.top}>
        <div className={s.brand}>
          <Logo tone="cream" height={24} />
          <BrandBody colour="var(--seda-cream)" max="32ch" className={s.tagline}>
            {tagline}
          </BrandBody>
        </div>

        <div className={s.columns}>
          {COLUMNS.map((column) => (
            <div key={column.heading} className={s.column}>
              <h2>{column.heading}</h2>
              <div className={s.columnItems}>
                {column.items.map((item) => (
                  <Link key={item.label} href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={s.newsletter}>
          <h2 id="newsletter-heading">Newsletter</h2>
          <form className={s.signup} aria-labelledby="newsletter-heading">
            <label className="seda-visually-hidden" htmlFor="newsletter-email">
              Email address
            </label>
            <input
              id="newsletter-email"
              className={s.input}
              type="email"
              name="email"
              placeholder="your@email.com"
              autoComplete="email"
            />
            <Cta tone="cream" type="submit" className={s.join}>
              Join
            </Cta>
          </form>
        </div>
      </div>

      <div className={s.bottom}>
        <span>Wear Șèdá</span>
        <span className={s.year}>2026</span>
      </div>
    </footer>
  );
}
