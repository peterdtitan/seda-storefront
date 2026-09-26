import type { Metadata } from "next";

import { takings } from "@/lib/admin/payments";
import { requirePermission } from "@/lib/auth/permissions";
import { formatNaira } from "@/lib/money";
import {
  fetchBalance,
  fetchSettlements,
  isLiveKey,
  isPaystackConfigured,
} from "@/lib/paystack/client";

import s from "./payouts.module.css";

export const metadata: Metadata = { title: "Payouts" };

export const dynamic = "force-dynamic";

function when(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function PayoutsPage() {
  await requirePermission("payouts.read");

  const [balances, settlements, money] = await Promise.all([
    fetchBalance(),
    fetchSettlements(),
    takings(30),
  ]);

  const naira = balances.find((b) => b.currency === "NGN");
  const queued = settlements.filter((row) => row.status !== "success");
  const paidOut = settlements.filter((row) => row.status === "success");

  return (
    <>
      <div className={s.head}>
        <h1 className={s.title}>Payouts</h1>
        <p className={s.lede}>What Paystack is holding, and what it has already sent on.</p>
      </div>

      {!isPaystackConfigured ? (
        <p className={s.bad}>No Paystack key is set, so there is nothing to read.</p>
      ) : (
        <>
          {!isLiveKey && (
            <p className={s.note}>
              Paystack is in <strong>test mode</strong>. These are test balances, not money.
            </p>
          )}

          <ul className={s.tiles}>
            <li className={s.tile}>
              <span className={s.tileLabel}>Paystack balance</span>
              <span className={s.tileValue}>{naira ? formatNaira(naira.balanceKobo) : "—"}</span>
              <span className={s.tileNote}>waiting to be settled</span>
            </li>
            <li className={s.tile}>
              <span className={s.tileLabel}>Settled recently</span>
              <span className={s.tileValue}>
                {formatNaira(paidOut.reduce((total, row) => total + row.amountKobo, 0))}
              </span>
              <span className={s.tileNote}>
                {paidOut.length} {paidOut.length === 1 ? "payout" : "payouts"}
              </span>
            </li>
            <li className={s.tile}>
              <span className={s.tileLabel}>Taken, 30 days</span>
              <span className={s.tileValue}>{formatNaira(money.settledKobo)}</span>
              <span className={s.tileNote}>{money.settledCount} orders</span>
            </li>
          </ul>

          <section className={s.card}>
            <h2 className={s.cardTitle}>How the money reaches you</h2>
            {/* Worth stating plainly rather than shipping a button that cannot work.
                Paystack Nigeria settles on its own schedule to the registered bank
                account; there is no "pay me now" call to make. */}
            <p className={s.body}>
              Paystack settles to your registered bank account on its own schedule — daily by
              default, on T+1 for card payments. There is no request to make from here, which is why
              this screen reports rather than asks.
            </p>
            <p className={s.body}>
              To change the account or the schedule, or to move money somewhere other than the
              settlement account, use the Paystack dashboard. Those actions need the bank details
              and two-factor approval that live there, and putting a second path to them behind a
              magic link would be the weakest point in this whole panel.
            </p>
          </section>

          <section className={s.card} aria-labelledby="queued">
            <div className={s.cardHead}>
              <h2 id="queued" className={s.cardTitle}>
                On its way
              </h2>
              <span className={s.count}>{queued.length}</span>
            </div>
            {queued.length === 0 ? (
              <p className={s.quiet}>Nothing queued.</p>
            ) : (
              <ul className={s.rows}>
                {queued.map((row) => (
                  <li key={row.id} className={s.row}>
                    <span className={s.rowStatus}>{row.status}</span>
                    <span className={s.rowMoney}>{formatNaira(row.amountKobo)}</span>
                    <span className={s.rowWhen}>started {when(row.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={s.card} aria-labelledby="history">
            <h2 id="history" className={s.cardTitle}>
              Already paid out
            </h2>
            {paidOut.length === 0 ? (
              <p className={s.quiet}>
                Nothing settled yet. The first payout lands once Paystack has takings to send.
              </p>
            ) : (
              <ul className={s.rows}>
                {paidOut.map((row) => (
                  <li key={row.id} className={s.row}>
                    <span className={s.rowStatus} data-good="true">
                      {row.status}
                    </span>
                    <span className={s.rowMoney}>{formatNaira(row.amountKobo)}</span>
                    <span className={s.rowWhen}>{when(row.settledAt ?? row.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
