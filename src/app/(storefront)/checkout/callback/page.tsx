import type { Metadata } from "next";

import { Cta, Outline } from "@/components/ui/Button";
import { StateMessage } from "@/components/ui/StateMessage";
import { fulfilOrder } from "@/lib/orders/fulfil";
import { findOrder, markFailed, markPaid } from "@/lib/orders/store";
import { formatNaira } from "@/lib/money";
import { verifyTransaction } from "@/lib/paystack/client";

import { ClearBag } from "./ClearBag";

export const metadata: Metadata = {
  title: "Order",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ reference?: string; trxref?: string }>;

export default async function CheckoutCallback({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const reference = params.reference ?? params.trxref ?? "";

  if (!reference) {
    return (
      <StateMessage
        as="h1"
        eyebrow="Order"
        title="We could not find that order"
        body="The link is missing its reference. If you were charged, email us and we will sort it out."
      >
        <Cta href="/shop">Back to the shop</Cta>
        <Outline href="/contact">Get in touch</Outline>
      </StateMessage>
    );
  }

  // This page is reachable by anyone with a URL, so nothing in it is trusted. The
  // truth comes from Paystack, asked server side, and is reconciled against what we
  // recorded when the order was created.
  const verified = await verifyTransaction(reference);

  if (verified?.status === "success") {
    const outcome = await markPaid({
      reference,
      amountKobo: verified.amountKobo,
      paystackStatus: verified.status,
      paidAt: verified.paidAt,
      channel: verified.channel,
      gatewayResponse: verified.gatewayResponse,
      raw: verified,
    });

    // The shopper often lands here before Paystack's webhook arrives, so this is
    // frequently the first thing to learn about the payment.
    if (outcome === "paid" || outcome === "already") {
      await fulfilOrder({
        reference,
        totalKobo: verified.amountKobo,
        firstTransition: outcome === "paid",
      });
    }
  } else if (verified && verified.status !== "ongoing" && verified.status !== "pending") {
    await markFailed(reference, verified.gatewayResponse);
  }

  const order = await findOrder(reference);

  if (order?.status === "paid") {
    return (
      <>
        <ClearBag />
        <StateMessage
          as="h1"
          eyebrow="Thank you"
          title="Your order is confirmed"
          body={
            <>
              We have your payment of {formatNaira(Number(order.total_kobo))} and a confirmation is
              on its way to {order.email}. Your reference is {order.reference}.
            </>
          }
        >
          <Cta href="/shop">Continue shopping</Cta>
        </StateMessage>
      </>
    );
  }

  return (
    <StateMessage
      as="h1"
      eyebrow="Payment"
      tone="fault"
      title="That payment did not go through"
      body={
        <>
          Nothing has been taken. Your bag is still here if you would like to try again — and if you
          think you were charged, email us with the reference {reference} and we will check.
        </>
      }
    >
      <Cta href="/checkout">Try again</Cta>
      <Outline href="/contact">Get in touch</Outline>
    </StateMessage>
  );
}
