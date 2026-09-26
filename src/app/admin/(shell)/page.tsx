import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { currentActor } from "@/lib/auth/permissions";
import { recentOrders, summary } from "@/lib/admin/dashboard";
import { formatNaira } from "@/lib/money";
import { shortDate } from "@/lib/admin/when";
import { PanelSkeleton, TileSkeleton } from "@/components/admin/Loading";

import m from "@/components/admin/motion.module.css";
import s from "./dashboard.module.css";

export const metadata: Metadata = { title: "Dashboard" };

export const dynamic = "force-dynamic";

const FULFILMENT: Record<string, string> = {
  unfulfilled: "Unfulfilled",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function firstName(name: string | null | undefined, email: string) {
  return name?.split(" ")[0] ?? email.split("@")[0];
}

async function Tiles() {
  const counts = await summary();

  const tiles = [
    {
      label: "Awaiting fulfilment",
      value: String(counts.awaitingFulfilment),
      note: "paid, not yet packed",
      href: "/admin/fulfilment",
      urgent: counts.awaitingFulfilment > 0,
    },
    {
      label: "Out for delivery",
      value: String(counts.outForDelivery),
      note: "with a courier now",
      href: "/admin/fulfilment",
    },
    {
      label: "Paid today",
      value: String(counts.paidToday),
      note: formatNaira(counts.revenueTodayKobo),
      href: "/admin/orders",
    },
    {
      label: "Paid this week",
      value: String(counts.paidWeek),
      note: formatNaira(counts.revenueWeekKobo),
      href: "/admin/orders",
    },
  ];

  return (
    <>
      <ul className={s.tiles}>
        {tiles.map((tile, index) => (
          <li key={tile.label} className={m.rise} style={{ "--i": index } as React.CSSProperties}>
            <Link href={tile.href} className={s.tile} data-urgent={tile.urgent || undefined}>
              <span className={s.tileLabel}>{tile.label}</span>
              <span className={s.tileValue}>{tile.value}</span>
              <span className={s.tileNote}>{tile.note}</span>
            </Link>
          </li>
        ))}
      </ul>

      {(counts.stockIssues > 0 || counts.pendingPayment > 0) && (
        <ul className={s.flags}>
          {counts.stockIssues > 0 && (
            <li className={s.flag} data-tone="danger">
              <strong>{counts.stockIssues}</strong> paid{" "}
              {counts.stockIssues === 1 ? "order" : "orders"} whose stock never moved. Someone has
              to look.
            </li>
          )}
          {counts.pendingPayment > 0 && (
            <li className={s.flag}>
              {/* Not an error on its own. A pile of them means the payment step is
                  failing, which is worth noticing before the week's takings do. */}
              <strong>{counts.pendingPayment}</strong> started checkout this week and did not come
              back.
            </li>
          )}
        </ul>
      )}
    </>
  );
}

async function Recent() {
  const orders = await recentOrders();

  return (
    <section className={`${s.panel} ${m.rise}`} aria-labelledby="recent">
      <div className={s.panelHead}>
        <h2 id="recent" className={s.panelTitle}>
          Recent orders
        </h2>
        <Link href="/admin/orders" className={s.panelLink}>
          All orders
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className={s.empty}>No orders yet. They appear here the moment Paystack confirms one.</p>
      ) : (
        <ul className={s.orders}>
          {orders.map((order) => (
            <li key={order.reference} className={s.order}>
              <Link href={`/admin/orders/${order.reference}`} className={s.orderMain}>
                <span className={s.orderName}>{order.name}</span>
                <span className={s.orderRef}>{order.reference}</span>
              </Link>

              <span className={s.orderMeta}>
                <span className={s.badge} data-status={order.status}>
                  {order.status}
                </span>
                {order.status === "paid" && (
                  <span className={s.badge} data-fulfilment={order.fulfilmentStatus}>
                    {FULFILMENT[order.fulfilmentStatus] ?? order.fulfilmentStatus}
                  </span>
                )}
              </span>

              <span className={s.orderTotal}>{formatNaira(order.totalKobo)}</span>
              <time className={s.orderWhen} dateTime={order.placedAt}>
                {shortDate(order.placedAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function DashboardPage() {
  const actor = await currentActor();

  return (
    <>
      <div className={s.head}>
        <h1 className={s.title}>Good day, {firstName(actor?.name, actor?.email ?? "")}</h1>
        <p className={s.lede}>Everything that needs a decision today.</p>
      </div>

      {/* The greeting comes from the session that is already loaded, so it paints
          immediately; the counts and the list each wait only on themselves. */}
      <Suspense fallback={<TileSkeleton />}>
        <Tiles />
      </Suspense>

      <Suspense fallback={<PanelSkeleton rows={6} />}>
        <Recent />
      </Suspense>
    </>
  );
}
