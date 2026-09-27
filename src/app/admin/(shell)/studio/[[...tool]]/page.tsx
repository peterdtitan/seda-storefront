import { redirect } from "next/navigation";
import { NextStudio } from "next-sanity/studio";

import config from "../../../../../../sanity.config";
import { requirePermission } from "@/lib/auth/permissions";

import s from "./studio.module.css";

export const metadata = {
  title: "Studio",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * Sanity Studio, kept as an escape hatch.
 *
 * The catalogue is edited at /admin/catalogue now, in this panel's own session — the
 * whole point being that whoever runs the shop never needs a Sanity account. This
 * route survives for the cases that editor cannot express: repairing a document by
 * hand, or reading history after a bad save.
 *
 * Superuser only, and not because of the data. Studio authenticates against Sanity's
 * own user system and knows nothing about our roles, so once it loads it will let you
 * write anything your Sanity seat allows. Our permission check cannot narrow that, so
 * the honest gate is the narrowest one.
 */
export default async function StudioPage() {
  const actor = await requirePermission("catalogue.write");
  if (actor.tier !== "superuser") redirect("/admin/catalogue");

  return (
    <div className={s.frame}>
      <NextStudio config={config} />
    </div>
  );
}
