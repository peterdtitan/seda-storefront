import type { Metadata } from "next";
import Link from "next/link";

import { listCategories, listProductOptions } from "@/lib/catalogue/read";

import { blankProduct } from "@/lib/catalogue/blank";

import { ProductForm } from "@/components/admin/catalogue/ProductForm";
import s from "@/components/admin/catalogue/catalogue.module.css";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const [categories, products] = await Promise.all([listCategories(), listProductOptions()]);

  if (categories.length === 0) {
    return (
      <>
        <h1 className={s.title}>Add a garment</h1>
        <p className={s.emptyState}>
          There are no categories yet, and a product needs one to appear in the shop filters.
          <br />
          <Link className={s.ghost} href="/admin/catalogue/categories" style={{ marginTop: 12 }}>
            Add a category first
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <div className={s.head}>
        <div>
          <h1 className={s.title}>Add a garment</h1>
          <p className={s.lede}>
            It stays hidden from the shop until you tick it visible, so there is no rush to get
            everything right in one sitting.
          </p>
        </div>
      </div>

      <ProductForm
        id={null}
        rev={null}
        initial={blankProduct(categories[0].id)}
        categories={categories.map((row) => ({ value: row.id, label: row.title }))}
        others={products.map((row) => ({ value: row.id, label: row.name }))}
      />
    </>
  );
}
