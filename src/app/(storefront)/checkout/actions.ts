"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { CART_COOKIE, parseCart } from "@/lib/cart/types";
import { priceCart } from "@/lib/orders/price";
import { createPendingOrder, newReference } from "@/lib/orders/store";
import { initialiseTransaction, isPaystackConfigured } from "@/lib/paystack/client";

export type CheckoutState = { status: "idle" } | { status: "error"; message: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function field(data: FormData, name: string, max: number) {
  return String(data.get(name) ?? "")
    .trim()
    .slice(0, max);
}

export async function startCheckout(
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const name = field(formData, "name", 120);
  const email = field(formData, "email", 254);
  const phone = field(formData, "phone", 32);
  const address = field(formData, "address", 240);
  const city = field(formData, "city", 80);
  const state = field(formData, "state", 80);

  if (!name || !EMAIL.test(email) || !address || !city) {
    return { status: "error", message: "Please fill in your name, email, address and city." };
  }

  if (!isPaystackConfigured) {
    return {
      status: "error",
      message:
        "Card payment is not switched on yet. Email wearsedastudio@gmail.com and we will take your order directly.",
    };
  }

  const jar = await cookies();
  const cart = parseCart(jar.get(CART_COOKIE)?.value);

  // Prices and stock come from the CMS here, not from the browser.
  const priced = await priceCart(cart);
  if (!priced.ok) return { status: "error", message: priced.message };

  const reference = newReference();

  // The order row is written before Paystack is called. If the call fails the order
  // stays pending and is visible in the admin; the alternative is taking a payment
  // for something we have no record of.
  try {
    await createPendingOrder({
      reference,
      customer: { name, email, phone, address, city, state },
      lines: priced.lines,
      subtotalKobo: priced.subtotalKobo,
      deliveryKobo: priced.deliveryKobo,
      totalKobo: priced.totalKobo,
    });
  } catch (error) {
    console.error("[checkout] could not record the order", error);
    return {
      status: "error",
      message: "We could not start your order. Please try again in a moment.",
    };
  }

  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host") ?? "localhost:3000";
  const proto = head.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  const result = await initialiseTransaction({
    email,
    amountKobo: priced.totalKobo,
    reference,
    callbackUrl: `${proto}://${host}/checkout/callback`,
    metadata: {
      reference,
      customer_name: name,
      lines: priced.lines.map(
        (l) => `${l.productName} / ${l.colourName} / ${l.size} x${l.quantity}`,
      ),
    },
  });

  if (!result.ok) return { status: "error", message: result.message };

  redirect(result.authorizationUrl);
}
