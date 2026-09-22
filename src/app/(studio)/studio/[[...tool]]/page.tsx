/**
 * Embedded Sanity Studio. The catch-all segment lets the Studio own its own
 * routing below /studio; the layout in this route group drops the storefront
 * chrome so the Studio renders full-bleed.
 */

import { NextStudio } from "next-sanity/studio";

import config from "../../../../../sanity.config";

export const dynamic = "force-static";

export { metadata, viewport } from "next-sanity/studio";

export default function StudioPage() {
  return <NextStudio config={config} />;
}
