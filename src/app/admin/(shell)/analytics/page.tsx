import type { Metadata } from "next";
import { Suspense } from "react";

import { Busy, ChartSkeleton, PanelSkeleton, TileSkeleton } from "@/components/admin/Loading";
import { requirePermission } from "@/lib/auth/permissions";

import { Funnel, Headline, NextSteps, SalesOverTime, WhatSells, WhereTheyGo } from "./Sections";
import s from "./analytics.module.css";

export const metadata: Metadata = { title: "Analytics" };

export const dynamic = "force-dynamic";

/**
 * Each section streams on its own.
 *
 * The shell and the heading arrive with the first byte; a panel waiting on a slow
 * query holds up only itself. Before this, one report deciding to take 400ms held
 * the whole screen blank for 400ms.
 */
export default async function AnalyticsPage() {
  await requirePermission("analytics.read");

  return (
    <>
      <div className={s.head}>
        <h1 className={s.title}>Analytics</h1>
        <p className={s.lede}>Last thirty days, first-party only. Nothing is shared.</p>
      </div>

      <Suspense
        fallback={
          <>
            <TileSkeleton />
            <Busy what="the headline figures" />
          </>
        }
      >
        <Headline />
      </Suspense>

      <Suspense fallback={<PanelSkeleton rows={5} />}>
        <NextSteps />
      </Suspense>

      <Suspense fallback={<ChartSkeleton height={200} />}>
        <SalesOverTime />
      </Suspense>

      <Suspense fallback={<PanelSkeleton rows={5} />}>
        <Funnel />
      </Suspense>

      <Suspense
        fallback={
          <div className={s.grid}>
            <PanelSkeleton rows={6} />
            <PanelSkeleton rows={6} />
          </div>
        }
      >
        <WhatSells />
      </Suspense>

      <Suspense
        fallback={
          <div className={s.grid}>
            <PanelSkeleton rows={6} />
            <PanelSkeleton rows={4} />
          </div>
        }
      >
        <WhereTheyGo />
      </Suspense>
    </>
  );
}
