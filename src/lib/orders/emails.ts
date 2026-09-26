import "server-only";

import { sendCustomerEmail, type CustomerOrder, type EmailKind } from "@/lib/email/customer";
import { requireSql } from "@/lib/db";

export type EmailState = {
  kind: EmailKind;
  claimedAt: string;
  sentAt: string | null;
  providerId: string | null;
  error: string | null;
};

/**
 * Sends a customer email exactly once, ever.
 *
 * The claim is an insert against a unique (order_id, kind), so two admins pressing
 * the same button at the same moment, or a retried webhook, cannot both get through —
 * the database refuses the second one rather than application code remembering to.
 *
 * A failure leaves the row with no sent_at and the reason on it, which is what the
 * order screen reads. Deleting it instead would hide the failure and invite a
 * double-send the next time anything touched the order.
 */
export async function sendOnce(
  kind: EmailKind,
  order: CustomerOrder,
): Promise<"sent" | "already" | "failed"> {
  const sql = requireSql();

  const claimed = await sql<{ id: string }[]>`
    insert into email_deliveries (order_id, kind)
    select o.id, ${kind} from orders o where o.reference = ${order.reference}
    on conflict (order_id, kind) do nothing
    returning id
  `;

  if (claimed.length === 0) return "already";

  try {
    const { providerId } = await sendCustomerEmail(kind, order);
    await sql`
      update email_deliveries set sent_at = now(), provider_id = ${providerId}, error = null
      where id = ${Number(claimed[0].id)}
    `;
    return "sent";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[email] send failed", { reference: order.reference, kind, message });
    await sql`
      update email_deliveries set error = ${message.slice(0, 500)}
      where id = ${Number(claimed[0].id)}
    `;
    return "failed";
  }
}

/** Clears a failed claim so it can be tried again. Only ever a row that was claimed
 * and never sent — a sent row is left alone, because the customer already has it. */
export async function retryEmail(reference: string, kind: EmailKind): Promise<boolean> {
  const sql = requireSql();
  const rows = await sql<{ id: string }[]>`
    delete from email_deliveries d
    using orders o
    where d.order_id = o.id and o.reference = ${reference}
      and d.kind = ${kind} and d.sent_at is null
    returning d.id
  `;
  return rows.length > 0;
}

export async function emailStates(reference: string): Promise<EmailState[]> {
  const sql = requireSql();
  return sql<EmailState[]>`
    select d.kind,
           to_char(d.claimed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "claimedAt",
           to_char(d.sent_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "sentAt",
           d.provider_id as "providerId", d.error
    from email_deliveries d
    join orders o on o.id = d.order_id
    where o.reference = ${reference}
    order by d.claimed_at
  `;
}

/** What the customer emails need, read once. */
export async function customerOrder(reference: string): Promise<CustomerOrder | null> {
  const sql = requireSql();

  const [order] = await sql<
    {
      reference: string;
      name: string;
      email: string;
      total_kobo: string;
      address: string | null;
      city: string | null;
    }[]
  >`
    select reference, name, email, total_kobo, address, city
    from orders where reference = ${reference}
  `;
  if (!order) return null;

  const items = await sql<
    { product_name: string; colour_name: string; size: string; quantity: number }[]
  >`
    select i.product_name, i.colour_name, i.size, i.quantity
    from order_items i join orders o on o.id = i.order_id
    where o.reference = ${reference} order by i.id
  `;

  return {
    reference: order.reference,
    name: order.name,
    email: order.email,
    totalKobo: Number(order.total_kobo),
    address: order.address,
    city: order.city,
    items: items.map((item) => ({
      productName: item.product_name,
      colourName: item.colour_name,
      size: item.size,
      quantity: item.quantity,
    })),
  };
}
