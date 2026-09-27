import type { Metadata } from "next";
import Link from "next/link";

import { listProducts } from "@/lib/catalogue/read";

import { ProductList } from "@/components/admin/catalogue/ProductList";
import s from "@/components/admin/catalogue/catalogue.module.css";

export const metadata: Metadata = { title: "Catalogue" };

export default async function CataloguePage() {
  const products = await listProducts();
  const live = products.filter((product) => product.active).length;

  return (
    <>
      <div className={s.head}>
        <div>
          <h1 className={s.title}>Products</h1>
          <p className={s.lede}>
            {products.length} in the catalogue, {live} visible in the shop. Changes appear on the
            site as soon as they are saved.
          </p>
        </div>
        <Link className={s.primary} href="/admin/catalogue/products/new">
          Add a garment
        </Link>
      </div>

      <section className={s.card}>
        <ProductList rows={products} />
      </section>
    </>
  );
}
