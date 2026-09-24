import type { Metadata } from "next";

import { SITE, siteUrl } from "@/lib/site";
import { fontVariables } from "@/styles/fonts";

import "./globals.css";

export const metadata: Metadata = {
  // Without this, every relative Open Graph and canonical URL resolves against
  // localhost in a build and silently ships that way.
  metadataBase: siteUrl,
  title: {
    default: SITE.title,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  // No canonical or og:title here on purpose. Anything set at the root is inherited
  // by every page that does not override it, which had /bag declaring itself a
  // duplicate of the home page and /shop sharing under the site's generic title.
  // Each route states its own; a page with none emits none, which beats a wrong one.
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
