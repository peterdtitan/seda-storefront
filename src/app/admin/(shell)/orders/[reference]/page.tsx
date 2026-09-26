import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/admin/Status";
import { FULFILMENT_LABEL, type FulfilmentStatus } from "@/lib/admin/orderStatus";
import { findOrderDetail } from "@/lib/admin/orders";
import { requirePermission } from "@/lib/auth/permissions";
import { emailStates } from "@/lib/orders/emails";
import { refundableKobo, refundsFor } from "@/lib/orders/refunds";
import { RefundForm } from "../../refunds/RefundForm";
import { ACTION_LABEL, NEXT } from "@/lib/orders/fulfilment";
import { formatNaira } from "@/lib/money";
import { fullDateAndTime as when } from "@/lib/admin/when";

import { FulfilmentControls } from "./FulfilmentControls";
import { ResendEmail } from "./ResendEmail";
import s from "./detail.module.css";

const EMAIL_LABEL: Record<string, string> = {
  order_confirmation: "Order confirmation",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ reference: string }>;
}): Promise<Metadata> {
  const { reference } = await params;
  return { title: `Order ${reference}` };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const actor = await requirePermission("orders.read");

  const { reference } = await params;
  const order = await findOrderDetail(reference);
  if (!order) notFound();

  const [emails, refunds, refundable] = await Promise.all([
    emailStates(reference),
    actor.can("refunds.read") ? refundsFor(reference) : Promise.resolve([]),
    actor.can("refunds.write") ? refundableKobo(reference) : Promise.resolve(0),
  ]);
  const canFulfil = actor.can("orders.fulfil");
  const showRefunds =
    actor.can("refunds.read") && (order.status === "paid" || order.status === "refunded");
  const moves = (NEXT[order.fulfilmentStatus as FulfilmentStatus] ?? []).map((to) => ({
    to,
    label: ACTION_LABEL[to],
  }));

  const fulfilmentBlocked =
    order.status !== "paid"
      ? `Fulfilment opens once the payment lands. This order is ${order.status}.`
      : !canFulfil
        ? "Your account can see orders but not move them."
        : moves.length === 0
          ? "Nothing left to do here."
          : undefined;

  return (
    <>
      <nav className={s.crumb} aria-label="Breadcrumb">
        <Link href="/admin/orders">Orders</Link>
        <span aria-hidden="true"> / </span>
        <span>{order.reference}</span>
      </nav>

      <div className={s.head}>
        <div>
          <h1 className={s.title}>{order.name}</h1>
          <p className={s.ref}>{order.reference}</p>
        </div>
        <div className={s.headBadges}>
          <Badge kind="payment" value={order.status} />
          {order.status === "paid" && <Badge kind="fulfilment" value={order.fulfilmentStatus} />}
        </div>
      </div>

      {order.stockError && (
        <p className={s.alert} role="status">
          <strong>Stock did not move.</strong> {order.stockError}
        </p>
      )}

      <section className={s.card} aria-labelledby="fulfilment">
        <h2 id="fulfilment" className={s.cardTitle}>
          Fulfilment
        </h2>
        <p className={s.currently}>
          Currently <strong>{FULFILMENT_LABEL[order.fulfilmentStatus]}</strong>
          {order.courierNote ? ` · ${order.courierNote}` : ""}
        </p>
        <FulfilmentControls
          reference={order.reference}
          options={moves}
          disabledReason={fulfilmentBlocked}
        />
      </section>

      <section className={s.card} aria-labelledby="emails">
        <h2 id="emails" className={s.cardTitle}>
          Emails to the customer
        </h2>
        {emails.length === 0 ? (
          <p className={s.quiet}>None sent yet.</p>
        ) : (
          <ul className={s.emails}>
            {emails.map((mail) => (
              <li key={mail.kind} className={s.emailRow}>
                <span className={s.emailKind}>{EMAIL_LABEL[mail.kind] ?? mail.kind}</span>
                {mail.sentAt ? (
                  <span className={s.emailSent}>
                    sent {when(mail.sentAt)}
                    {mail.providerId === "dev:console" ? " (dev, not really)" : ""}
                  </span>
                ) : (
                  <span className={s.emailFailed}>{mail.error ?? "claimed, not sent"}</span>
                )}
                {!mail.sentAt && canFulfil && (
                  <ResendEmail reference={order.reference} kind={mail.kind} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={s.columns}>
        <section className={s.card} aria-labelledby="items">
          <h2 id="items" className={s.cardTitle}>
            What was bought
          </h2>

          <ul className={s.items}>
            {order.items.map((item, index) => (
              <li key={`${item.productSlug}-${item.size}-${index}`} className={s.item}>
                <span className={s.itemName}>
                  {item.productName}
                  <span className={s.itemVariant}>
                    {item.colourName} · {item.size}
                  </span>
                </span>
                <span className={s.itemQty}>×{item.quantity}</span>
                <span className={s.itemMoney}>{formatNaira(item.lineKobo)}</span>
              </li>
            ))}
          </ul>

          {/* The prices here are what the customer paid, frozen at purchase. A price
              edit in the CMS afterwards must not rewrite this. */}
          <dl className={s.totals}>
            <div className={s.totalRow}>
              <dt>Subtotal</dt>
              <dd>{formatNaira(order.subtotalKobo)}</dd>
            </div>
            <div className={s.totalRow}>
              <dt>Delivery</dt>
              <dd>{order.deliveryKobo === 0 ? "Free" : formatNaira(order.deliveryKobo)}</dd>
            </div>
            <div className={s.totalRow} data-grand="true">
              <dt>Total</dt>
              <dd>{formatNaira(order.totalKobo)}</dd>
            </div>
          </dl>
        </section>

        <div className={s.side}>
          <section className={s.card} aria-labelledby="customer">
            <h2 id="customer" className={s.cardTitle}>
              Customer
            </h2>
            <dl className={s.facts}>
              <div className={s.fact}>
                <dt>Name</dt>
                <dd>{order.name}</dd>
              </div>
              <div className={s.fact}>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${order.email}`}>{order.email}</a>
                </dd>
              </div>
              {order.phone && (
                <div className={s.fact}>
                  <dt>Phone</dt>
                  <dd>
                    <a href={`tel:${order.phone}`}>{order.phone}</a>
                  </dd>
                </div>
              )}
              <div className={s.fact}>
                <dt>Deliver to</dt>
                <dd>
                  {[order.address, order.city, order.state].filter(Boolean).join(", ") || "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className={s.card} aria-labelledby="payment">
            <h2 id="payment" className={s.cardTitle}>
              Payment
            </h2>
            <dl className={s.facts}>
              <div className={s.fact}>
                <dt>Placed</dt>
                <dd>{when(order.placedAt)}</dd>
              </div>
              <div className={s.fact}>
                <dt>Paid</dt>
                <dd>{when(order.paidAt)}</dd>
              </div>
              <div className={s.fact}>
                <dt>Channel</dt>
                <dd>{order.channel ?? "—"}</dd>
              </div>
              <div className={s.fact}>
                <dt>Paystack</dt>
                <dd>{order.paystackStatus ?? "—"}</dd>
              </div>
              {order.gatewayResponse && (
                <div className={s.fact}>
                  <dt>Gateway</dt>
                  <dd>{order.gatewayResponse}</dd>
                </div>
              )}
              <div className={s.fact}>
                <dt>Stock taken</dt>
                <dd>{when(order.stockAdjustedAt)}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      {showRefunds && (
        <section className={s.card} aria-labelledby="refunds">
          <h2 id="refunds" className={s.cardTitle}>
            Refunds
          </h2>

          {refunds.length > 0 && (
            <ul className={s.refundList}>
              {refunds.map((refund) => (
                <li key={refund.id} className={s.refundRow}>
                  <span className={s.refundMoney}>{formatNaira(refund.amountKobo)}</span>
                  <span className={s.refundState} data-status={refund.status}>
                    {refund.status}
                  </span>
                  <span className={s.refundWhy}>{refund.reason}</span>
                  <span className={s.refundWho}>
                    {refund.requestedEmail} · {when(refund.requestedAt)}
                  </span>
                  {refund.error && <span className={s.refundError}>{refund.error}</span>}
                </li>
              ))}
            </ul>
          )}

          {actor.can("refunds.write") ? (
            <RefundForm reference={order.reference} refundableKobo={refundable} />
          ) : (
            refunds.length === 0 && (
              <p className={s.quiet}>None. Your account can see refunds but not start one.</p>
            )
          )}
        </section>
      )}

      <section className={s.card} aria-labelledby="history">
        <h2 id="history" className={s.cardTitle}>
          History
        </h2>

        {order.events.length === 0 ? (
          <p className={s.quiet}>
            Nothing recorded yet. Every fulfilment change lands here with who made it.
          </p>
        ) : (
          <ol className={s.events}>
            {order.events.map((event, index) => (
              <li key={index} className={s.event}>
                <time className={s.eventWhen} dateTime={event.at}>
                  {when(event.at)}
                </time>
                <span className={s.eventWhat}>
                  {event.kind}
                  {event.fromValue && event.toValue && (
                    <>
                      {" "}
                      <span className={s.quiet}>
                        {event.fromValue} → {event.toValue}
                      </span>
                    </>
                  )}
                  {event.note && <span className={s.eventNote}>{event.note}</span>}
                </span>
                <span className={s.eventWho}>{event.actorEmail ?? "system"}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
