import type { Metadata } from "next";

import { requireSuperuser } from "@/lib/auth/superuser";
import { sanityFetch } from "@/sanity/lib/client";
import { absoluteUrl, isProductionSite, siteOrigin } from "@/lib/site";

import panels from "../panels.module.css";
import s from "./seo.module.css";

export const metadata: Metadata = { title: "SEO" };

export const dynamic = "force-dynamic";

type Indexed = { slug: string; name: string; updatedAt: string | null };

export default async function SeoPage() {
  await requireSuperuser();

  const products =
    (await sanityFetch<Indexed[]>(
      `*[_type == "product" && defined(slug.current)]{ "slug": slug.current, name, "updatedAt": _updatedAt } | order(_updatedAt desc)`,
    )) ?? [];

  const fixed = ["/", "/shop", "/lookbook", "/story", "/contact"];
  const indexable = fixed.length + products.length;

  // These are the routes that deliberately stay out of an index. Listing them beside
  // the count is the point: a page missing from search is only a problem if it was
  // supposed to be there.
  const excluded = [
    { path: "/bag", why: "per-visitor and empty to a crawler" },
    { path: "/checkout", why: "per-visitor" },
    { path: "/admin", why: "not public work" },
    { path: "/superuser", why: "not public work" },
    { path: "/studio", why: "the CMS" },
    { path: "/styleguide", why: "development only" },
  ];

  return (
    <>
      <h1 className={panels.title}>SEO</h1>
      <p className={panels.lede}>What this deployment asserts about itself.</p>

      <section className={panels.panel}>
        <h2 className={panels.panelTitle}>Crawl posture</h2>
        <dl className={s.facts}>
          <div className={s.fact}>
            <dt>Origin</dt>
            <dd>{siteOrigin}</dd>
          </div>
          <div className={s.fact}>
            <dt>robots.txt</dt>
            <dd>
              {isProductionSite ? (
                <>Open, with the private routes disallowed.</>
              ) : (
                <>
                  <strong>Disallow: /</strong> — this is not the production origin, so it refuses
                  every crawler. That is deliberate: a preview sharing the same content would
                  compete with the real domain for its own queries.
                </>
              )}
            </dd>
          </div>
          <div className={s.fact}>
            <dt>Sitemap</dt>
            <dd>{absoluteUrl("/sitemap.xml")}</dd>
          </div>
          <div className={s.fact}>
            <dt>Indexable pages</dt>
            <dd>
              {indexable} — {fixed.length} fixed, {products.length} pieces
            </dd>
          </div>
        </dl>
      </section>

      <div className={s.pair}>
        <section className={panels.panel}>
          <div className={panels.panelHead}>
            <h2 className={panels.panelTitle}>In the sitemap</h2>
            <span className={panels.count}>{indexable}</span>
          </div>
          <ul className={s.paths}>
            {fixed.map((path) => (
              <li key={path} className={s.path}>
                <span>{path}</span>
                <span className={s.pathNote}>fixed</span>
              </li>
            ))}
            {products.map((product) => (
              <li key={product.slug} className={s.path}>
                <span>/product/{product.slug}</span>
                <span className={s.pathNote}>
                  {product.updatedAt
                    ? new Date(product.updatedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className={panels.panel}>
          <h2 className={panels.panelTitle}>Kept out on purpose</h2>
          <ul className={s.paths}>
            {excluded.map((row) => (
              <li key={row.path} className={s.path}>
                <span>{row.path}</span>
                <span className={s.pathNote}>{row.why}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={panels.panel}>
        <h2 className={panels.panelTitle}>What this screen cannot tell you</h2>
        {/* Saying so beats a row of zeros that looks like a ranking. */}
        <p className={s.body}>
          Positions, impressions and clicks live in Google Search Console and Bing Webmaster Tools.
          Nothing in this app can see them — they are not derivable from the site&rsquo;s own data,
          and any number shown here claiming otherwise would be invented.
        </p>
        <p className={s.body}>
          To get them in here, the domain has to be verified with Google and an OAuth credential
          issued for the Search Console API. That is a decision with a Google account attached to
          it, so it is left for you to make rather than assumed.
        </p>
      </section>
    </>
  );
}
