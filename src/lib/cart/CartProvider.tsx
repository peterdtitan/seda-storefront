"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
  /** Speak a change that is otherwise only visible as the header count moving. */
  announce: (message: string) => void;
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
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Adding the same piece twice writes the same string, and a live region that has
  // not changed says nothing. Emptying it first makes the second add a change again.
  const announce = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage("");
    timer.current = setTimeout(() => setMessage(next), 60);
  }, []);

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

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
    () => ({ cart, count: cartCount(cart), add, setQuantity, remove, clear, announce }),
    [cart, add, setQuantity, remove, clear, announce],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <div className="seda-visually-hidden" role="status" aria-live="polite">
        {message}
      </div>
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
