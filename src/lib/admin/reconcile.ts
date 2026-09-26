import "server-only";

import { requireSql } from "@/lib/db";
import { fulfilOrder } from "@/lib/orders/fulfil";
import { markFailed, markPaid } from "@/lib/orders/store";
import { isPaystackConfigured, verifyTransaction } from "@/lib/paystack/client";

export type Finding = {
  reference: string;
  ours: string;
  theirs: string;
  amountOurs: number;
  amountTheirs: number;
  action: "recovered" | "marked_failed" | "agrees" | "mismatch" | "unknown";
  note: string;
};

export type Reconciliation = {
  checked: number;
  findings: Finding[];
  ranAt: Date;
};

/** How many references one run will verify. Paystack is rate limited and this is a
 * button a person presses, not a cron — a bounded pass that returns quickly beats an
 * exhaustive one that times out. */
const BATCH = 25;

/**
 * Asks Paystack what really happened to the orders our own records are unsure about.
 *
 * The case that matters: an order still pending because the webhook never arrived and
 * the customer closed the tab before the callback ran. Paystack has their money and we
 * have no record of it. Verifying finds those, and fulfilling them here goes through
 * the same markPaid and fulfilOrder the webhook uses — including the amount check, the
 * stock claim and the one-per-order email — so recovery cannot double-charge stock or
 * double-mail anyone.
 */
export async function reconcile(): Promise<Reconciliation> {
  const sql = requireSql();
  const ranAt = new Date();

  if (!isPaystackConfigured) {
    return { checked: 0, ranAt, findings: [] };
  }

  const candidates = await sql<{ reference: string; status: string; total_kobo: string }[]>`
    select reference, status, total_kobo from orders
    where status = 'pending'
      and placed_at < now() - interval '30 minutes'
      and placed_at > now() - interval '30 days'
    order by placed_at desc
    limit ${BATCH}
  `;

  const findings: Finding[] = [];

  for (const order of candidates) {
    const verified = await verifyTransaction(order.reference);
    const ours = order.status;
    const amountOurs = Number(order.total_kobo);

    if (!verified) {
      findings.push({
        reference: order.reference,
        ours,
        theirs: "unreachable",
        amountOurs,
        amountTheirs: 0,
        action: "unknown",
        note: "Paystack did not answer for this reference.",
      });
      continue;
    }

    const base = {
      reference: order.reference,
      ours,
      theirs: verified.status,
      amountOurs,
      amountTheirs: verified.amountKobo,
    };

    if (verified.status === "success") {
      const outcome = await markPaid({
        reference: order.reference,
        amountKobo: verified.amountKobo,
        paystackStatus: verified.status,
        paidAt: verified.paidAt,
        channel: verified.channel,
        gatewayResponse: verified.gatewayResponse,
        raw: { source: "reconciliation", verified },
      });

      if (outcome === "mismatch") {
        findings.push({
          ...base,
          action: "mismatch",
          note: "Paystack took a different amount from the one we asked for. Do not fulfil; look at this by hand.",
        });
        continue;
      }

      if (outcome === "paid" || outcome === "already") {
        await fulfilOrder({
          reference: order.reference,
          totalKobo: verified.amountKobo,
          firstTransition: outcome === "paid",
        });
        findings.push({
          ...base,
          action: "recovered",
          note: "Paid all along. Now marked paid, stock taken and the customer emailed.",
        });
        continue;
      }

      findings.push({ ...base, action: "unknown", note: `Could not mark it paid (${outcome}).` });
      continue;
    }

    if (verified.status === "failed") {
      await markFailed(order.reference, verified.gatewayResponse);
      findings.push({ ...base, action: "marked_failed", note: "Paystack says the card failed." });
      continue;
    }

    // abandoned, ongoing, anything else: our pending matches their not-paid.
    findings.push({
      ...base,
      action: "agrees",
      note: `Paystack also has it as ${verified.status}. Nothing owed.`,
    });
  }

  return { checked: candidates.length, findings, ranAt };
}
