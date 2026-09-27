import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { listProductOptions, loadLook } from "@/lib/catalogue/read";

import { LookForm } from "@/components/admin/catalogue/LookForm";
import s from "@/components/admin/catalogue/catalogue.module.css";

export const metadata: Metadata = { title: "Edit look" };

export default async function EditLookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const [loaded, products] = await Promise.all([loadLook(id), listProductOptions()]);

  if (!loaded) notFound();

  return (
    <>
      <div className={s.head}>
        <h1 className={s.title}>
          Look {String(loaded.input.order).padStart(2, "0")}
          {loaded.input.title ? ` — ${loaded.input.title}` : ""}
        </h1>
      </div>

      {created && (
        <p className={`${s.status} ${s.good}`} role="status" style={{ marginBottom: 14 }}>
          The look is live on the lookbook.
        </p>
      )}

      <LookForm
        id={loaded.id}
        rev={loaded.rev}
        initial={loaded.input}
        products={products.map((row) => ({ value: row.id, label: row.name }))}
      />
    </>
  );
}
