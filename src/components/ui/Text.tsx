import type { CSSProperties, ElementType, ReactNode } from "react";

type Vars = CSSProperties & Record<`--${string}`, string>;

type TextProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function Eyebrow({
  as: Tag = "div",
  children,
  className,
  style,
  colour,
}: TextProps & { colour?: string }) {
  return (
    <Tag
      className={["seda-eyebrow", className].filter(Boolean).join(" ")}
      style={{ ...(colour ? { "--eyebrow-color": colour } : {}), ...style } as Vars}
    >
      {children}
    </Tag>
  );
}

export function Display({
  as: Tag = "div",
  size,
  colour,
  children,
  className,
  style,
}: TextProps & { size: string; colour?: string }) {
  return (
    <Tag
      className={["seda-disp", className].filter(Boolean).join(" ")}
      style={
        {
          "--disp-size": size,
          ...(colour ? { "--disp-color": colour } : {}),
          ...style,
        } as Vars
      }
    >
      {children}
    </Tag>
  );
}

export function BrandBody({
  as: Tag = "p",
  colour,
  max,
  size,
  children,
  className,
  style,
}: TextProps & { colour?: string; max?: string; size?: string }) {
  return (
    <Tag
      className={["seda-brand-body", className].filter(Boolean).join(" ")}
      style={
        {
          ...(colour ? { "--brand-body-color": colour } : {}),
          ...(max ? { "--brand-body-max": max } : {}),
          ...(size ? { "--brand-body-size": size } : {}),
          ...style,
        } as Vars
      }
    >
      {children}
    </Tag>
  );
}

export function UiLabel({
  as: Tag = "span",
  colour,
  children,
  className,
  style,
}: TextProps & { colour?: string }) {
  return (
    <Tag
      className={["seda-ui-label", className].filter(Boolean).join(" ")}
      style={{ ...(colour ? { "--ui-label-color": colour } : {}), ...style } as Vars}
    >
      {children}
    </Tag>
  );
}
