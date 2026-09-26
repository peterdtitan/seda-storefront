import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Badge } from "@/components/admin/Status";
import { listOrders } from "@/lib/admin/orders";
import { requirePermission } from "@/lib/auth/permissions";
import { formatNaira } from "@/lib/money";
import { shortDate } from "@/lib/admin/when";
import { PanelSkeleton } from "@/components/admin/Loading";

import { Filters } from "./Filters";
import s from "./orders.module.css";

export const metadata: Metadata = { title: "Orders" };

export const dynamic = "force-dynamic";

type Search = { status?: string; fulfilment?: string; query?: string; page?: string };

async function Results({ params }: { params: Search }) {
  const page = Number(params.page) || 1;
  const { orders, total, pages } = await listOrders({
    status: params.status,
    fulfilment: params.fulfilment,
    query: params.query,
    page,
  });

  const filtered = Boolean(params.status || params.fulfilment || params.query);

  function pageHref(next: number) {
    const search = new URLSearchParams();
    if (params.status) search.set("status", params.status);
    if (params.fulfilment) search.set("fulfilment", params.fulfilment);
    if (params.query) search.set("query", params.query);
    if (next > 1) search.set("page", String(next));
    const qs = search.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  }

  return (
    <>
      <p className={s.lede}>
        {total === 0
          ? filtered
            ? "No orders match those filters."
            : "No orders yet."
          : `${total} ${total === 1 ? "order" : "orders"}${filtered ? " matching" : ""}`}
      </p>

      {orders.length === 0 ? (
        <p className={s.empty}>
          {filtered ? (
            <>
              Nothing here. <Link href="/admin/orders">Clear the filters</Link> to see everything.
            </>
          ) : (
            "Orders appear the moment Paystack confirms one."
          )}
        </p>
      ) : (
        <ul className={s.list}>
          {orders.map((order) => (
            <li key={order.reference} className={s.row}>
              <Link href={`/admin/orders/${order.reference}`} className={s.rowMain}>
                <span className={s.rowName}>{order.name}</span>
                <span className={s.rowSub}>
                  {order.reference} · {order.items} {order.items === 1 ? "item" : "items"}
                </span>
              </Link>

              <span className={s.rowBadges}>
                <Badge kind="payment" value={order.status} />
                {order.status === "paid" && (
                  <Badge kind="fulfilment" value={order.fulfilmentStatus} />
                )}
                {order.stockError && (
                  <span className={s.stockFlag} title={order.stockError}>
                    stock
                  </span>
                )}
              </span>

              <span className={s.rowTotal}>{formatNaira(order.totalKobo)}</span>
              <time className={s.rowWhen} dateTime={order.placedAt}>
                {shortDate(order.placedAt)}
              </time>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className={s.pager} aria-label="Orders pages">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className={s.pagerLink} rel="prev">
              Previous
            </Link>
          ) : (
            <span className={s.pagerSpent}>Previous</span>
          )}
          <span className={s.pagerCount}>
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={pageHref(page + 1)} className={s.pagerLink} rel="next">
              Next
            </Link>
          ) : (
            <span className={s.pagerSpent}>Next</span>
          )}
        </nav>
      )}
    </>
  );
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requirePermission("orders.read");
  const params = await searchParams;

  return (
    <>
      <div className={s.head}>
        <h1 className={s.title}>Orders</h1>
      </div>

      {/* The filter bar is not waiting on anything, so it renders with the shell and
          stays usable while the list behind it is still being fetched. A new filter
          keys the boundary, which puts the skeleton back rather than leaving the old
          results on screen pretending to be the new ones. */}
      <Filters
        status={params.status ?? ""}
        fulfilment={params.fulfilment ?? ""}
        query={params.query ?? ""}
      />

      <Suspense
        key={`${params.status}-${params.fulfilment}-${params.query}-${params.page}`}
        fallback={<PanelSkeleton rows={6} title={false} />}
      >
        <Results params={params} />
      </Suspense>
    </>
  );
}
