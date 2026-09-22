import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { PageViews } from "@/components/PageViews";
import { sanityFetch } from "@/sanity/lib/client";
import { FOOTER_QUERY } from "@/sanity/lib/queries";

import s from "./layout.module.css";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const copy = await sanityFetch<{ tagline: string }>(FOOTER_QUERY);

  return (
    <div className={s.shell}>
      <PageViews />
      <Header />
      <main id="main" className={s.main}>
        {children}
      </main>
      <Footer tagline={copy?.tagline ?? "Made in Nigeria, designed for it too."} />
    </div>
  );
}
