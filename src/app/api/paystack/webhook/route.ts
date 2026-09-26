import { NextResponse } from "next/server";

import { EVENTS } from "@/lib/analytics/events";
import { recordEvents } from "@/lib/analytics/record";
import { fulfilOrder } from "@/lib/orders/fulfil";
import { recordRefundOutcome } from "@/lib/orders/refunds";
import { markFailed, markPaid, orderAttribution, recordEventOnce } from "@/lib/orders/store";
import { isValidSignature } from "@/lib/paystack/signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaystackWebhook = {
  event: string;
  data?: {
    id?: number;
    reference?: string;
    amount?: number;
    status?: string;
    paid_at?: string | null;
    channel?: string | null;
    gateway_response?: string | null;
    // refund.* carries the refund's own id and the transaction it belongs to.
    transaction_reference?: string;
  };
};

export async function POST(request: Request) {
  // Read the body as text, not JSON: the signature is over the exact bytes sent, and
  // parsing then re-serialising produces a different hash.
  const raw = await request.text();

  if (!isValidSignature(raw, request.headers.get("x-paystack-signature"))) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  let body: PaystackWebhook;
  try {
    body = JSON.parse(raw) as PaystackWebhook;
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }

  const reference = body.data?.reference ?? null;
  const eventId = body.data?.id ? `${body.event}:${body.data.id}` : `${body.event}:${reference}`;

  try {
    const isNew = await recordEventOnce({
      eventId,
      eventType: body.event,
      reference,
      payload: body,
    });

    // Paystack retries until it gets a 2xx, so a duplicate is expected traffic, not
    // an error. Acknowledge it and do nothing.
    if (!isNew) return NextResponse.json({ received: true, duplicate: true });

    if (body.event === "charge.success" && reference) {
      const outcome = await markPaid({
        reference,
        amountKobo: body.data?.amount ?? 0,
        paystackStatus: body.data?.status ?? "success",
        paidAt: body.data?.paid_at ?? null,
        channel: body.data?.channel ?? null,
        gatewayResponse: body.data?.gateway_response ?? null,
        raw: body,
      });

      // "already" still fulfils: the callback page may have marked it paid while
      // stock adjustment was left undone, and fulfilOrder claims its own work.
      if (outcome === "paid" || outcome === "already") {
        await fulfilOrder({
          reference,
          totalKobo: body.data?.amount ?? 0,
          firstTransition: outcome === "paid",
        });
      }
    } else if (body.event.startsWith("refund.")) {
      // Paystack is the only thing that knows whether the money actually went back,
      // so the refund row stays pending until this arrives.
      const providerId = body.data?.id ? String(body.data.id) : null;
      if (providerId) {
        await recordRefundOutcome({
          providerId,
          status: body.event === "refund.processed" ? "processed" : "failed",
          raw: body,
        });
      }
    } else if (body.event === "charge.failed" && reference) {
      await markFailed(reference, body.data?.gateway_response ?? null);
      const who = await orderAttribution(reference);
      await recordEvents([
        {
          name: EVENTS.paymentFailed,
          visitorId: who.visitorId ?? `order:${reference}`,
          sessionId: who.sessionId ?? `order:${reference}`,
          valueKobo: body.data?.amount ?? 0,
          props: { reference, reason: body.data?.gateway_response ?? "unknown" },
        },
      ]);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[paystack] webhook failed", { eventId, error });
    // A 500 makes Paystack retry, which is what we want: the payment happened and
    // our side has not caught up yet.
    return new NextResponse("processing failed", { status: 500 });
  }
}
