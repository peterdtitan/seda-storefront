import type { CSSProperties, ElementType, ReactNode } from "react";

type Vars = CSSProperties & Record<`--${string}`, string>;

type TextProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** For aria-labelledby, which needs the heading to be addressable. */
  id?: string;
};

export function Eyebrow({
  as: Tag = "div",
  children,
  className,
  style,
  colour,
  id,
}: TextProps & { colour?: string }) {
  return (
    <Tag
      id={id}
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
  id,
}: TextProps & { size?: string; colour?: string }) {
  return (
    <Tag
      id={id}
      className={["seda-disp", className].filter(Boolean).join(" ")}
      style={
        {
          ...(size ? { "--disp-size": size } : {}),
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
  id,
}: TextProps & { colour?: string; max?: string; size?: string }) {
  return (
    <Tag
      id={id}
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
  id,
}: TextProps & { colour?: string }) {
  return (
    <Tag
      id={id}
      className={["seda-ui-label", className].filter(Boolean).join(" ")}
      style={{ ...(colour ? { "--ui-label-color": colour } : {}), ...style } as Vars}
    >
      {children}
    </Tag>
  );
}
