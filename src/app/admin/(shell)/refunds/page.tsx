import type { Metadata } from "next";
import Link from "next/link";

import { requirePermission } from "@/lib/auth/permissions";
import { listRefunds } from "@/lib/orders/refunds";
import { formatNaira } from "@/lib/money";
import { dateAndTime as when } from "@/lib/admin/when";

import s from "./refunds.module.css";

export const metadata: Metadata = { title: "Refunds" };

export const dynamic = "force-dynamic";

export default async function RefundsPage() {
  await requirePermission("refunds.read");
  const refunds = await listRefunds();

  const pending = refunds.filter((r) => r.status === "pending");
  const returned = refunds
    .filter((r) => r.status === "processed")
    .reduce((total, r) => total + r.amountKobo, 0);

  return (
    <>
      <div className={s.head}>
        <h1 className={s.title}>Refunds</h1>
        <p className={s.lede}>
          Started from an order. Paystack decides when the money is actually back.
        </p>
      </div>

      <ul className={s.tiles}>
        <li className={s.tile}>
          <span className={s.tileLabel}>Returned</span>
          <span className={s.tileValue}>{formatNaira(returned)}</span>
          <span className={s.tileNote}>confirmed by Paystack</span>
        </li>
        <li className={s.tile}>
          <span className={s.tileLabel}>In flight</span>
          <span className={s.tileValue}>{pending.length}</span>
          <span className={s.tileNote}>awaiting confirmation</span>
        </li>
      </ul>

      <section className={s.card}>
        <h2 className={s.cardTitle}>Everything requested</h2>

        {refunds.length === 0 ? (
          <p className={s.quiet}>
            None yet. Open an order and use the refund panel on it — a refund always belongs to an
            order, so there is nothing to start from here.
          </p>
        ) : (
          <ul className={s.rows}>
            {refunds.map((refund) => (
              <li key={refund.id} className={s.row} data-status={refund.status}>
                <Link href={`/admin/orders/${refund.reference}`} className={s.rowMain}>
                  <span className={s.rowName}>{refund.customer}</span>
                  <span className={s.rowSub}>{refund.reason}</span>
                </Link>

                <span className={s.rowStatus} data-status={refund.status}>
                  {refund.status}
                </span>
                <span className={s.rowMoney}>
                  {formatNaira(refund.amountKobo)}
                  {refund.amountKobo < refund.orderTotalKobo && (
                    <span className={s.partial}> of {formatNaira(refund.orderTotalKobo)}</span>
                  )}
                </span>
                <span className={s.rowWho}>
                  {refund.requestedEmail}
                  <span className={s.rowWhen}>{when(refund.requestedAt)}</span>
                </span>
                {refund.error && <span className={s.rowError}>{refund.error}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
