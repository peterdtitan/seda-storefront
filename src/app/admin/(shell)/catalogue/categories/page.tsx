import type { Metadata } from "next";

import { listCategories } from "@/lib/catalogue/read";

import { CategoriesEditor } from "@/components/admin/catalogue/CategoriesEditor";
import s from "@/components/admin/catalogue/catalogue.module.css";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await listCategories();

  return (
    <>
      <div className={s.head}>
        <div>
          <h1 className={s.title}>Categories</h1>
          <p className={s.lede}>
            The filter row above the shop grid: All · Bottoms · Tops · Sets · Outerwear.
          </p>
        </div>
      </div>

      <CategoriesEditor rows={categories} />
    </>
  );
}
