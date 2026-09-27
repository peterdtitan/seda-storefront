import type { Metadata } from "next";
import Link from "next/link";

import { listLooks } from "@/lib/catalogue/read";
import { assetPreview } from "@/lib/catalogue/preview";

import s from "@/components/admin/catalogue/catalogue.module.css";

export const metadata: Metadata = { title: "Lookbook" };

export default async function LooksPage() {
  const looks = await listLooks();
  const feature = looks.filter((look) => look.feature).length;

  return (
    <>
      <div className={s.head}>
        <div>
          <h1 className={s.title}>Lookbook</h1>
          <p className={s.lede}>
            One look renders large at the top, the rest fill the grid beneath it in number order.
          </p>
        </div>
        <Link className={s.primary} href="/admin/catalogue/looks/new">
          Add a look
        </Link>
      </div>

      {looks.length > 0 && feature !== 1 && (
        <p className={`${s.status} ${s.bad}`} role="status" style={{ marginBottom: 12 }}>
          {feature === 0
            ? "No look is marked as the feature, so the lookbook has no large image at the top."
            : `${feature} looks are marked as the feature. The page will use whichever it finds first.`}
        </p>
      )}

      <section className={s.card}>
        {looks.length === 0 ? (
          <p className={s.emptyState}>
            No looks yet. The lookbook page stays empty until the first one is added.
          </p>
        ) : (
          <ul className={s.list}>
            {looks.map((look) => {
              const thumb = assetPreview(look.assetId, 112);
              return (
                <li key={look.id} className={s.item}>
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={s.itemThumb} src={thumb} alt="" width={56} height={70} />
                  ) : (
                    <span className={s.itemThumb} />
                  )}
                  <div className={s.itemBody}>
                    <Link className={s.itemName} href={`/admin/catalogue/looks/${look.id}`}>
                      Look {String(look.order).padStart(2, "0")}
                      {look.title ? ` — ${look.title}` : ""}
                    </Link>
                    <span className={s.itemMeta}>
                      {look.products} {look.products === 1 ? "piece" : "pieces"} linked
                    </span>
                  </div>
                  <div className={s.itemActions}>
                    {look.feature && <span className={s.pill}>Feature</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
