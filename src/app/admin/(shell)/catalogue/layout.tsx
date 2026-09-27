import { catalogueIsWritable } from "@/lib/catalogue/read";
import { requirePermission } from "@/lib/auth/permissions";

import { Tabs } from "@/components/admin/catalogue/Tabs";
import s from "@/components/admin/catalogue/catalogue.module.css";

export const dynamic = "force-dynamic";

/**
 * The gate for everything under /admin/catalogue.
 *
 * One check here rather than one per page, and every server action repeats it — a
 * layout guard stops a page rendering but does nothing about a POST aimed straight
 * at an action.
 */
export default async function CatalogueLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("catalogue.write");

  if (!catalogueIsWritable()) {
    return (
      <>
        <h1 className={s.title}>Catalogue</h1>
        <p className={s.emptyState}>
          SANITY_API_WRITE_TOKEN is not set on this deployment, so nothing here can be read or
          saved. Add it to the Vercel project and redeploy.
        </p>
      </>
    );
  }

  return (
    <>
      <Tabs />
      {children}
    </>
  );
}
