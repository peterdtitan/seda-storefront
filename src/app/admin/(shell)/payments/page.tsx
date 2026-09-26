import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PanelSkeleton, TileSkeleton } from "@/components/admin/Loading";
import { Badge } from "@/components/admin/Status";
import { concerns, recentPayments, takings } from "@/lib/admin/payments";
import { currentActor, requirePermission } from "@/lib/auth/permissions";
import { formatNaira } from "@/lib/money";
import { dateAndTime } from "@/lib/admin/when";
import { isLiveKey, isPaystackConfigured } from "@/lib/paystack/client";

import m from "@/components/admin/motion.module.css";
import { Reconcile } from "./Reconcile";
import s from "./payments.module.css";

export const metadata: Metadata = { title: "Payments" };

export const dynamic = "force-dynamic";

const CONCERN_TITLE: Record<string, string> = {
  stuck_pending: "Pending for a while",
  no_webhook: "No webhook recorded",
  stock_error: "Stock did not move",
};

const CONCERN_BLURB: Record<string, string> = {
  stuck_pending:
    "Reached Paystack and never came back. Check against Paystack below to find out which were actually paid.",
  no_webhook:
    "Paid, but the confirmation came from the callback page rather than a webhook. Harmless once; worth asking about if it becomes the norm.",
  stock_error: "Paid and fulfilled, but the inventory could not be adjusted.",
};

async function Takings() {
  const money = await takings();

  const tiles = [
    {
      label: "Settled",
      value: formatNaira(money.settledKobo),
      note: `${money.settledCount} ${money.settledCount === 1 ? "order" : "orders"}`,
    },
    {
      label: "Pending",
      value: formatNaira(money.pendingKobo),
      note: `${money.pendingCount} not confirmed`,
    },
    { label: "Failed", value: String(money.failedCount), note: "cards declined" },
    {
      label: "Refunded",
      value: formatNaira(money.refundedKobo),
      note: `${money.refundedCount} ${money.refundedCount === 1 ? "order" : "orders"}`,
    },
  ];

  return (
    <ul className={s.tiles}>
      {tiles.map((tile, index) => (
        <li
          key={tile.label}
          className={`${s.tile} ${m.rise}`}
          style={{ "--i": index } as React.CSSProperties}
        >
          <span className={s.tileLabel}>{tile.label}</span>
          <span className={s.tileValue}>{tile.value}</span>
          <span className={s.tileNote}>{tile.note}</span>
        </li>
      ))}
    </ul>
  );
}

async function Concerns() {
  const [actor, flags] = await Promise.all([currentActor(), concerns()]);

  const grouped = flags.reduce<Record<string, typeof flags>>((all, flag) => {
    (all[flag.kind] ??= []).push(flag);
    return all;
  }, {});

  const canRecover = actor?.can("orders.fulfil") ?? false;
  const stuck = grouped.stuck_pending?.length ?? 0;

  return (
    <>
      {Object.keys(grouped).length > 0 && (
        <div className={s.concerns}>
          {Object.entries(grouped).map(([kind, rows], index) => (
            <section
              key={kind}
              className={`${s.card} ${m.rise}`}
              style={{ "--i": index } as React.CSSProperties}
              aria-labelledby={`c-${kind}`}
            >
              <div className={s.cardHead}>
                <h2 id={`c-${kind}`} className={s.cardTitle}>
                  {CONCERN_TITLE[kind]}
                </h2>
                <span className={s.count}>{rows.length}</span>
              </div>
              <p className={s.quiet}>{CONCERN_BLURB[kind]}</p>

              <ul className={s.flagList}>
                {rows.slice(0, 8).map((row) => (
                  <li key={`${kind}-${row.reference}`} className={s.flagRow}>
                    <Link href={`/admin/orders/${row.reference}`} className={s.flagRef}>
                      {row.name}
                    </Link>
                    <span className={s.flagMoney}>{formatNaira(row.totalKobo)}</span>
                    <time className={s.flagWhen} dateTime={row.placedAt}>
                      {dateAndTime(row.placedAt)}
                    </time>
                    {row.detail && <span className={s.flagDetail}>{row.detail}</span>}
                  </li>
                ))}
              </ul>
              {rows.length > 8 && <p className={s.quiet}>and {rows.length - 8} more</p>}
            </section>
          ))}
        </div>
      )}

      {isPaystackConfigured &&
        (canRecover ? (
          <section className={`${s.card} ${m.rise}`}>
            <Reconcile pendingCount={stuck} />
          </section>
        ) : (
          <section className={`${s.card} ${m.rise}`}>
            <h2 className={s.cardTitle}>Check against Paystack</h2>
            <p className={s.quiet}>
              Recovering an order moves stock and emails a customer, so it needs fulfilment rights.
              Yours are read-only.
            </p>
          </section>
        ))}
    </>
  );
}

async function Recent() {
  const payments = await recentPayments();

  return (
    <section className={`${s.card} ${m.rise}`} aria-labelledby="recent">
      <div className={s.cardHead}>
        <h2 id="recent" className={s.cardTitle}>
          Recent payments
        </h2>
        <Link href="/admin/orders" className={s.allLink}>
          All orders
        </Link>
      </div>

      {payments.length === 0 ? (
        <p className={s.quiet}>Nothing yet.</p>
      ) : (
        <ul className={s.rows}>
          {payments.map((payment) => (
            <li key={payment.reference} className={s.row}>
              <Link href={`/admin/orders/${payment.reference}`} className={s.rowMain}>
                <span className={s.rowName}>{payment.name}</span>
                <span className={s.rowSub}>
                  {payment.channel ?? "—"} ·{" "}
                  {payment.webhooks > 0
                    ? `${payment.webhooks} webhook${payment.webhooks === 1 ? "" : "s"}`
                    : "no webhook"}
                </span>
              </Link>
              <span className={s.rowBadge}>
                <Badge kind="payment" value={payment.status} />
              </span>
              <span className={s.rowMoney}>{formatNaira(payment.totalKobo)}</span>
              <time className={s.rowWhen} dateTime={payment.paidAt ?? payment.placedAt}>
                {dateAndTime(payment.paidAt ?? payment.placedAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function PaymentsPage() {
  await requirePermission("payments.read");

  return (
    <>
      <div className={s.head}>
        <h1 className={s.title}>Payments</h1>
        <p className={s.lede}>Last thirty days.</p>
      </div>

      {!isPaystackConfigured ? (
        <p className={s.bad}>
          No Paystack key is set, so nothing here can be checked against them.
        </p>
      ) : (
        !isLiveKey && (
          <p className={s.testNote}>
            {/* Worth saying out loud. Test-mode figures look exactly like real ones. */}
            Paystack is in <strong>test mode</strong>. Everything below is play money.
          </p>
        )
      )}

      {/* Three boundaries rather than one await: the takings tiles are one aggregate
          and arrive first, while the concern lists and the payment history take as
          long as they take. */}
      <Suspense fallback={<TileSkeleton />}>
        <Takings />
      </Suspense>

      <Suspense fallback={<PanelSkeleton rows={4} />}>
        <Concerns />
      </Suspense>

      <Suspense fallback={<PanelSkeleton rows={6} />}>
        <Recent />
      </Suspense>
    </>
  );
}
