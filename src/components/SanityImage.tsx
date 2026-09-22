import Image from "next/image";
import type { CSSProperties } from "react";

import { urlForImage } from "@/sanity/lib/image";
import type { SanityImage as SanityImageValue } from "@/sanity/lib/types";

type Props = {
  image: SanityImageValue | null | undefined;
  sizes: string;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
  /** Cover-crop into a positioned parent instead of laying out at intrinsic size. */
  fill?: boolean;
  /** Pass "" when surrounding copy already names the image. */
  alt?: string;
};

export function SanityImage({ image, sizes, className, style, priority, fill, alt }: Props) {
  const asset = image?.asset;
  if (!asset?._id && !asset?._ref) return null;

  const url = urlForImage(image!)?.url();
  if (!url) return null;

  const resolved = alt ?? image?.alt ?? "";
  const decorative = image?.decorative === true || resolved === "";
  const dimensions = asset.metadata?.dimensions;

  const altText = decorative ? "" : resolved;

  const common = {
    src: url,
    sizes,
    className,
    style,
    priority,
    placeholder: asset.metadata?.lqip ? ("blur" as const) : undefined,
    blurDataURL: asset.metadata?.lqip,
  };

  if (fill) return <Image {...common} alt={altText} fill />;

  return (
    <Image
      {...common}
      alt={altText}
      width={dimensions?.width ?? 1600}
      height={dimensions?.height ?? 2000}
    />
  );
}
