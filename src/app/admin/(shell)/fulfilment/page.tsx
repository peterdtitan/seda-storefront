import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Badge } from "@/components/admin/Status";
import { FULFILMENT_LABEL } from "@/lib/admin/orderStatus";
import { listOrders } from "@/lib/admin/orders";
import { requirePermission } from "@/lib/auth/permissions";
import { formatNaira } from "@/lib/money";
import { shortDate } from "@/lib/admin/when";
import { PanelSkeleton } from "@/components/admin/Loading";

import m from "@/components/admin/motion.module.css";
import s from "./fulfilment.module.css";

export const metadata: Metadata = { title: "Fulfilment" };

export const dynamic = "force-dynamic";

// The working order of a day: pack what is paid, send out what is packed, close what
// arrived. Delivered and cancelled are done and live on the Orders screen instead.
const QUEUES = [
  {
    key: "unfulfilled",
    title: "To pack",
    blurb: "Paid and waiting. Nothing has been told to the customer yet.",
  },
  {
    key: "packed",
    title: "Ready to go",
    blurb: "Packed. Sending one out emails the customer.",
  },
  {
    key: "out_for_delivery",
    title: "With a courier",
    blurb: "Already announced. Mark delivered when it lands.",
  },
] as const;

/** One queue, fetched on its own so a slow one does not hold up the other two. */
async function Queue({ queue, index }: { queue: (typeof QUEUES)[number]; index: number }) {
  const { orders, total, pages } = await listOrders({
    status: "paid",
    fulfilment: queue.key,
  });

  return (
    <>
      {[{ ...queue, orders, total, pages }].map((queue) => (
        <section
          key={queue.key}
          className={`${s.queue} ${m.rise}`}
          style={{ "--i": index } as React.CSSProperties}
          aria-labelledby={`q-${queue.key}`}
        >
          <div className={s.queueHead}>
            <h2 id={`q-${queue.key}`} className={s.queueTitle}>
              {queue.title}
            </h2>
            <span className={s.queueCount}>{queue.total}</span>
          </div>
          <p className={s.queueBlurb}>{queue.blurb}</p>

          {queue.orders.length === 0 ? (
            <p className={s.queueEmpty}>Empty.</p>
          ) : (
            <ul className={s.cards}>
              {queue.orders.map((order) => (
                <li key={order.reference}>
                  <Link href={`/admin/orders/${order.reference}`} className={s.card}>
                    <span className={s.cardName}>{order.name}</span>
                    <span className={s.cardMeta}>
                      {order.items} {order.items === 1 ? "item" : "items"} ·{" "}
                      {formatNaira(order.totalKobo)}
                    </span>
                    <span className={s.cardFoot}>
                      <Badge kind="fulfilment" value={order.fulfilmentStatus} />
                      <time dateTime={order.placedAt} className={s.cardWhen}>
                        {shortDate(order.placedAt)}
                      </time>
                    </span>
                    {order.stockError && <span className={s.cardFlag}>stock problem</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {queue.pages > 1 && (
            <Link
              href={`/admin/orders?status=paid&fulfilment=${queue.key}`}
              className={s.queueMore}
            >
              See all {queue.total} {FULFILMENT_LABEL[queue.key].toLowerCase()}
            </Link>
          )}
        </section>
      ))}
    </>
  );
}

export default async function FulfilmentPage() {
  await requirePermission("orders.fulfil");

  return (
    <>
      <div className={s.head}>
        <h1 className={s.title}>Fulfilment</h1>
        <p className={s.lede}>Everything paid for and not yet delivered.</p>
      </div>

      <div className={s.queues}>
        {QUEUES.map((queue, index) => (
          <Suspense key={queue.key} fallback={<PanelSkeleton rows={3} />}>
            <Queue queue={queue} index={index} />
          </Suspense>
        ))}
      </div>
    </>
  );
}
