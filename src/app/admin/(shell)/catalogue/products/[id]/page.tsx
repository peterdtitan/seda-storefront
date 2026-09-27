import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { listCategories, listProductOptions, loadProduct } from "@/lib/catalogue/read";

import { ProductForm } from "@/components/admin/catalogue/ProductForm";
import s from "@/components/admin/catalogue/catalogue.module.css";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const [loaded, categories, products] = await Promise.all([
    loadProduct(id),
    listCategories(),
    listProductOptions(),
  ]);

  if (!loaded) notFound();

  return (
    <>
      <div className={s.head}>
        <div>
          <h1 className={s.title}>{loaded.input.name}</h1>
          <p className={s.lede}>
            {loaded.input.active
              ? "Visible in the shop."
              : "Hidden from the shop — only you can see it."}
          </p>
        </div>
      </div>

      {created && (
        <p className={`${s.status} ${s.good}`} role="status" style={{ marginBottom: 14 }}>
          {loaded.input.name} is in the catalogue. It stays hidden from the shop until you tick it
          visible.
        </p>
      )}

      <ProductForm
        id={loaded.id}
        rev={loaded.rev}
        initial={loaded.input}
        categories={categories.map((row) => ({ value: row.id, label: row.title }))}
        others={products
          .filter((row) => row.id !== loaded.id)
          .map((row) => ({ value: row.id, label: row.name }))}
      />
    </>
  );
}
