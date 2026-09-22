import { cookies } from "next/headers";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { PageViews } from "@/components/PageViews";
import { CartProvider } from "@/lib/cart/CartProvider";
import { CART_COOKIE, parseCart } from "@/lib/cart/types";
import { sanityFetch } from "@/sanity/lib/client";
import { FOOTER_QUERY } from "@/sanity/lib/queries";

import s from "./layout.module.css";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [copy, jar] = await Promise.all([
    sanityFetch<{ tagline: string }>(FOOTER_QUERY),
    cookies(),
  ]);
  const initialCart = parseCart(jar.get(CART_COOKIE)?.value);

  return (
    <CartProvider initialCart={initialCart}>
      <div className={s.shell}>
        <PageViews />
        <Header />
        <main id="main" className={s.main}>
          {children}
        </main>
        <Footer tagline={copy?.tagline ?? "Made in Nigeria, designed for it too."} />
      </div>
    </CartProvider>
  );
}
