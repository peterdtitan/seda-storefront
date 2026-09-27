import { urlForImage } from "@/sanity/lib/image";

/**
 * A thumbnail for the editor. Safe in the browser — the URL builder only needs the
 * public project id, so no token is involved and none is shipped.
 */
export function assetPreview(assetId: string | null | undefined, width: number): string | null {
  if (!assetId) return null;
  return urlForImage(assetId)?.width(width).quality(70).url() ?? null;
}
