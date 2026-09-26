import "server-only";

import { requireSql } from "@/lib/db";
import type { FulfilmentStatus } from "@/lib/admin/orderStatus";
import type { EmailKind } from "@/lib/email/customer";

import { customerOrder, sendOnce } from "./emails";

/**
 * Where a fulfilment can go next.
 *
 * delivered is reversible on purpose: somebody will tap it on the wrong row, and the
 * only thing worse than a mis-click is a mis-click that cannot be undone. Going back
 * to out_for_delivery does not re-email — email_deliveries has already claimed that
 * kind for this order and the claim is permanent.
 */
export const NEXT: Record<FulfilmentStatus, FulfilmentStatus[]> = {
  unfulfilled: ["packed", "cancelled"],
  packed: ["out_for_delivery", "unfulfilled", "cancelled"],
  out_for_delivery: ["delivered", "packed"],
  delivered: ["out_for_delivery"],
  cancelled: ["unfulfilled"],
};

export const ACTION_LABEL: Record<FulfilmentStatus, string> = {
  unfulfilled: "Back to unfulfilled",
  packed: "Mark packed",
  out_for_delivery: "Out for delivery",
  delivered: "Mark delivered",
  cancelled: "Cancel",
};

const EMAIL_ON: Partial<Record<FulfilmentStatus, EmailKind>> = {
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
};

export type TransitionResult =
  | { ok: true; to: FulfilmentStatus; email: "sent" | "already" | "failed" | "none" }
  | { ok: false; reason: string };

export async function moveFulfilment(input: {
  reference: string;
  to: FulfilmentStatus;
  actor: { id: string; email: string };
  note?: string;
}): Promise<TransitionResult> {
  const sql = requireSql();
  const { reference, to, actor } = input;

  const [order] = await sql<{ id: string; status: string; fulfilment_status: string }[]>`
    select id, status, fulfilment_status from orders where reference = ${reference}
  `;
  if (!order) return { ok: false, reason: "That order does not exist." };

  // Fulfilment is downstream of payment. Packing something nobody paid for is the
  // one mistake this screen must not make easy.
  if (order.status !== "paid") {
    return { ok: false, reason: `This order is ${order.status}, so it cannot be fulfilled yet.` };
  }

  const from = order.fulfilment_status as FulfilmentStatus;
  if (from === to) return { ok: false, reason: `It is already ${to.replace(/_/g, " ")}.` };
  if (!NEXT[from]?.includes(to)) {
    return {
      ok: false,
      reason: `Cannot go from ${from.replace(/_/g, " ")} to ${to.replace(/_/g, " ")}.`,
    };
  }

  // The where clause carries the expected state, so two admins pressing different
  // buttons at once cannot both win — the second update matches nothing.
  const moved = await sql<{ id: string }[]>`
    update orders set
      fulfilment_status = ${to},
      fulfilment_updated_at = now(),
      delivered_at = ${to === "delivered" ? sql`now()` : sql`delivered_at`}
    where reference = ${reference} and fulfilment_status = ${from}
    returning id
  `;

  if (moved.length === 0) {
    return { ok: false, reason: "Somebody else changed this order a moment ago. Reload and look." };
  }

  await sql`
    insert into order_events (order_id, actor_id, actor_email, kind, from_value, to_value, note)
    values (${Number(order.id)}, ${Number(actor.id)}, ${actor.email}, 'fulfilment',
            ${from}, ${to}, ${input.note?.slice(0, 500) ?? null})
  `;

  const kind = EMAIL_ON[to];
  if (!kind) return { ok: true, to, email: "none" };

  const customer = await customerOrder(reference);
  if (!customer) return { ok: true, to, email: "failed" };

  // The status change is already committed. An email that will not send is a problem
  // for the admin to see, not a reason to pretend the parcel did not go out.
  const email = await sendOnce(kind, customer);

  if (email === "failed") {
    await sql`
      insert into order_events (order_id, actor_id, actor_email, kind, note)
      values (${Number(order.id)}, ${Number(actor.id)}, ${actor.email}, 'email_failed',
              ${`Could not send the ${kind.replace(/_/g, " ")} email`})
    `;
  }

  return { ok: true, to, email };
}

/** Records the confirmation email against an order that has just been paid. Called
 * from fulfilOrder, so it runs from the webhook or the callback page, whichever gets
 * there first, and exactly once either way. */
export async function sendOrderConfirmation(reference: string) {
  const customer = await customerOrder(reference);
  if (!customer) return;
  await sendOnce("order_confirmation", customer);
}
