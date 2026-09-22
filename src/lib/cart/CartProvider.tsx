"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  CART_COOKIE,
  MAX_QUANTITY,
  cartCount,
  lineKey,
  serialiseCart,
  type Cart,
  type CartLine,
} from "./types";

type CartContextValue = {
  cart: Cart;
  count: number;
  add: (line: CartLine) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const ONE_MONTH = 60 * 60 * 24 * 30;

function writeCookie(cart: Cart) {
  // Not HttpOnly: the client owns the cart until checkout, where the server
  // re-reads it and prices the order itself.
  document.cookie = `${CART_COOKIE}=${serialiseCart(cart)}; path=/; max-age=${ONE_MONTH}; SameSite=Lax`;
}

export function CartProvider({
  initialCart,
  children,
}: {
  initialCart: Cart;
  children: React.ReactNode;
}) {
  const [cart, setCart] = useState<Cart>(initialCart);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) writeCookie(cart);
  }, [cart, dirty]);

  const add = useCallback((line: CartLine) => {
    setDirty(true);
    setCart((current) => {
      const key = lineKey(line);
      const existing = current.find((entry) => lineKey(entry) === key);
      if (!existing) return [...current, line];

      return current.map((entry) =>
        lineKey(entry) === key
          ? { ...entry, quantity: Math.min(entry.quantity + line.quantity, MAX_QUANTITY) }
          : entry,
      );
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setDirty(true);
    setCart((current) =>
      quantity < 1
        ? current.filter((entry) => lineKey(entry) !== key)
        : current.map((entry) =>
            lineKey(entry) === key
              ? { ...entry, quantity: Math.min(quantity, MAX_QUANTITY) }
              : entry,
          ),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setDirty(true);
    setCart((current) => current.filter((entry) => lineKey(entry) !== key));
  }, []);

  const clear = useCallback(() => {
    setDirty(true);
    setCart([]);
  }, []);

  const value = useMemo(
    () => ({ cart, count: cartCount(cart), add, setQuantity, remove, clear }),
    [cart, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
