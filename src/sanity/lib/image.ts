import { createImageUrlBuilder, type SanityImageSource } from "@sanity/image-url";

import { dataset, isSanityConfigured, projectId } from "@/sanity/env";

const builder = isSanityConfigured ? createImageUrlBuilder({ projectId, dataset }) : null;

export function urlForImage(source: SanityImageSource) {
  return builder?.image(source).auto("format").fit("max") ?? null;
}

export type { SanityImageSource };
