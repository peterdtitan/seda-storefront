import type { Metadata } from "next";

import { liveSessions, pulse, tableSizes, wounds } from "@/lib/admin/platform";
import { requireSuperuser } from "@/lib/auth/superuser";
import { isEmailConfigured } from "@/lib/email/send";
import { isLiveKey, isPaystackConfigured } from "@/lib/paystack/client";
import { isProductionSite, siteOrigin } from "@/lib/site";
import { dateAndTime as when } from "@/lib/admin/when";

import s from "./panels.module.css";

export const metadata: Metadata = { title: "Platform" };

export const dynamic = "force-dynamic";

function bytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(0)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

export default async function PlatformPage() {
  await requireSuperuser();

  const [beat, sizes, sessions, problems] = await Promise.all([
    pulse(),
    tableSizes(),
    liveSessions(),
    wounds(),
  ]);

  const totalBytes = sizes.reduce((total, row) => total + row.bytes, 0);

  const services = [
    { name: "Database", state: "Neon Postgres", good: true },
    {
      name: "Paystack",
      state: !isPaystackConfigured ? "no key" : isLiveKey ? "live" : "test mode",
      good: isPaystackConfigured,
    },
    {
      name: "Email",
      state: isEmailConfigured ? "Resend" : "no key — nothing sends",
      good: isEmailConfigured,
    },
    { name: "Origin", state: siteOrigin, good: isProductionSite },
  ];

  return (
    <>
      <h1 className={s.title}>Platform</h1>
      <p className={s.lede}>Everything the shop admin is not allowed to see.</p>

      <ul className={s.tiles}>
        <li className={s.tile}>
          <span className={s.tileLabel}>Events today</span>
          <span className={s.tileValue}>{beat.eventsToday.toLocaleString("en-NG")}</span>
          <span className={s.tileNote}>{beat.eventsWeek.toLocaleString("en-NG")} this week</span>
        </li>
        <li className={s.tile}>
          <span className={s.tileLabel}>Visitors</span>
          <span className={s.tileValue}>{beat.browserSessionsWeek}</span>
          <span className={s.tileNote}>sessions, 7 days</span>
        </li>
        <li className={s.tile}>
          <span className={s.tileLabel}>Orders</span>
          <span className={s.tileValue}>{beat.ordersWeek}</span>
          <span className={s.tileNote}>{beat.contactWeek} contact messages</span>
        </li>
        <li className={s.tile}>
          <span className={s.tileLabel}>Storage</span>
          <span className={s.tileValue}>{bytes(totalBytes)}</span>
          <span className={s.tileNote}>{sizes.length} tables</span>
        </li>
      </ul>

      <section className={s.panel}>
        <h2 className={s.panelTitle}>Services</h2>
        <ul className={s.services}>
          {services.map((service) => (
            <li key={service.name} className={s.service} data-good={service.good || undefined}>
              <span className={s.serviceName}>{service.name}</span>
              <span className={s.serviceState}>{service.state}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={s.panel}>
        <div className={s.panelHead}>
          <h2 className={s.panelTitle}>Unresolved</h2>
          <span className={s.count}>{problems.length}</span>
        </div>
        {problems.length === 0 ? (
          <p className={s.quiet}>
            Nothing broken. No unadjusted stock, no unsent email, no stuck refund.
          </p>
        ) : (
          <ul className={s.wounds}>
            {problems.map((problem, index) => (
              <li key={index} className={s.wound}>
                <span className={s.woundKind} data-kind={problem.kind}>
                  {problem.kind}
                </span>
                <span className={s.woundDetail}>{problem.detail}</span>
                <span className={s.woundRef}>{problem.reference ?? "—"}</span>
                <span className={s.woundWhen}>{when(problem.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={s.pair}>
        <section className={s.panel}>
          <div className={s.panelHead}>
            <h2 className={s.panelTitle}>Signed in now</h2>
            <span className={s.count}>{sessions.length}</span>
          </div>
          {sessions.length === 0 ? (
            <p className={s.quiet}>Nobody.</p>
          ) : (
            <ul className={s.rows}>
              {sessions.map((session, index) => (
                <li key={index} className={s.row}>
                  <span className={s.rowMain}>
                    {session.email}
                    <span className={s.rowSub}>{session.tier}</span>
                  </span>
                  <span className={s.rowSide}>
                    since {when(session.createdAt)}
                    <span className={s.rowSub}>until {when(session.expiresAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={s.panel}>
          <h2 className={s.panelTitle}>Tables</h2>
          <ul className={s.rows}>
            {sizes.map((size) => (
              <li key={size.table} className={s.row}>
                <span className={s.rowMain}>{size.table}</span>
                <span className={s.rowSide}>
                  {bytes(size.bytes)}
                  <span className={s.rowSub}>~{size.rows.toLocaleString("en-NG")} rows</span>
                </span>
              </li>
            ))}
          </ul>
          {/* reltuples is the planner's estimate, refreshed by autovacuum rather than
              counted, so it lags after a big insert. Cheap, and close enough to spot
              a table growing when it should not be. */}
          <p className={s.footnote}>Row counts are the planner&rsquo;s estimate, not a count.</p>
        </section>
      </div>
    </>
  );
}
