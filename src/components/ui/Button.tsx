import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import s from "./Button.module.css";

export type Tone = "oxblood" | "cream" | "ink";

type Common = {
  tone?: Tone;
  full?: boolean;
  children: ReactNode;
  className?: string;
};

type AsButton = Common & ComponentPropsWithoutRef<"button"> & { href?: never };
type AsLink = Common & Omit<ComponentPropsWithoutRef<typeof Link>, "href"> & { href: string };

function classes(variant: "solid" | "outline", { tone = "oxblood", full, className }: Common) {
  return [s.base, s[variant], s[tone], full ? s.full : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
}

export function Cta(props: AsButton | AsLink) {
  const { tone, full, className, children, ...rest } = props;
  const cn = classes("solid", { tone, full, className, children });

  if ("href" in rest && rest.href) {
    const { href, ...linkProps } = rest as AsLink;
    return (
      <Link href={href} className={cn} {...linkProps}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={cn} {...(rest as ComponentPropsWithoutRef<"button">)}>
      {children}
    </button>
  );
}

export function Outline(props: AsButton | AsLink) {
  const { tone, full, className, children, ...rest } = props;
  const cn = classes("outline", { tone, full, className, children });

  if ("href" in rest && rest.href) {
    const { href, ...linkProps } = rest as AsLink;
    return (
      <Link href={href} className={cn} {...linkProps}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={cn} {...(rest as ComponentPropsWithoutRef<"button">)}>
      {children}
    </button>
  );
}
