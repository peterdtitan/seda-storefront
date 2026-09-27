import type { Metadata } from "next";

import { listProductOptions, loadCopy } from "@/lib/catalogue/read";

import { ContentEditor } from "@/components/admin/catalogue/ContentEditor";
import s from "@/components/admin/catalogue/catalogue.module.css";

export const metadata: Metadata = { title: "Site content" };

export default async function ContentPage() {
  const [copy, products] = await Promise.all([loadCopy(), listProductOptions()]);

  return (
    <>
      <div className={s.head}>
        <div>
          <h1 className={s.title}>Site content</h1>
          <p className={s.lede}>
            Every word and photograph on the site that is not a garment. Each block saves on its
            own, so changing the announcement does not touch anything else.
          </p>
        </div>
      </div>

      <ContentEditor
        initial={copy.input}
        products={products.map((row) => ({ value: row.id, label: row.name }))}
      />
    </>
  );
}
