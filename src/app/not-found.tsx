import Link from "next/link";

import { Logo } from "@/components/ui/Logo";

/** A URL that matches no route never enters the (storefront) group, so it gets the
 * root layout with no header or footer. This page therefore carries its own way out
 * rather than inheriting the chrome. */
export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeContent: "center",
        justifyItems: "center",
        textAlign: "center",
        padding: "40px 20px",
        gap: "20px",
      }}
    >
      <Link href="/" aria-label="Șèdá — home">
        <Logo height={28} />
      </Link>

      <h1 className="seda-disp" style={{ margin: 0 }}>
        We cannot find that page
      </h1>

      <p className="seda-brand-body" style={{ margin: 0, maxWidth: "42ch" }}>
        The link may be out of date, or the piece it pointed at may have been retired.
      </p>

      <p style={{ margin: 0, display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <Link href="/shop">Shop the drop</Link>
        <Link href="/lookbook">Lookbook</Link>
        <Link href="/contact">Get in touch</Link>
      </p>
    </main>
  );
}
