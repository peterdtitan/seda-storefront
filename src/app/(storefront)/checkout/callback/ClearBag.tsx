"use client";

import { useEffect } from "react";

import { useCart } from "@/lib/cart/CartProvider";

/** The bag cookie belongs to the browser, and a Server Component cannot write one,
 * so the paid order clears it from here. Without this the shopper lands on their
 * confirmation with the pieces they just bought still sitting in the bag. */
export function ClearBag() {
  const { clear, announce } = useCart();

  useEffect(() => {
    clear();
    announce("Your bag is empty. Your order is confirmed.");
  }, [clear, announce]);

  return null;
}
