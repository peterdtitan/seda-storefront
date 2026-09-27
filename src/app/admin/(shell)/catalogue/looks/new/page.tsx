import type { Metadata } from "next";

import { listLooks, listProductOptions } from "@/lib/catalogue/read";

import { blankLook } from "@/lib/catalogue/blank";

import { LookForm } from "@/components/admin/catalogue/LookForm";
import s from "@/components/admin/catalogue/catalogue.module.css";

export const metadata: Metadata = { title: "New look" };

export default async function NewLookPage() {
  const [looks, products] = await Promise.all([listLooks(), listProductOptions()]);
  const nextOrder = looks.reduce((highest, look) => Math.max(highest, look.order), 0) + 1;

  return (
    <>
      <div className={s.head}>
        <h1 className={s.title}>Add a look</h1>
      </div>

      <LookForm
        id={null}
        rev={null}
        initial={blankLook(nextOrder)}
        products={products.map((row) => ({ value: row.id, label: row.name }))}
      />
    </>
  );
}
