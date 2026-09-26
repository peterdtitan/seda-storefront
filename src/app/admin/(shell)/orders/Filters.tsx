"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { FULFILMENT_LABEL, FULFILMENT_STATUSES, PAYMENT_STATUSES } from "@/lib/admin/orderStatus";

import s from "./orders.module.css";

export function Filters({
  status,
  fulfilment,
  query,
}: {
  status: string;
  fulfilment: string;
  query: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [text, setText] = useState(query);
  const first = useRef(true);

  function apply(next: Record<string, string>) {
    const search = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value);
      else search.delete(key);
    }
    // Any filter change starts again at the first page. Staying on page 4 of a
    // narrower result set is how you get an empty screen and think it is broken.
    search.delete("page");
    router.replace(`${pathname}?${search}`);
  }

  // Typing should not push a navigation per keystroke. The first run is skipped so
  // arriving with ?query= in the URL does not immediately replace it with itself.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => apply({ query: text }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className={s.filters}>
      <div className={s.searchWrap}>
        <label htmlFor="order-search" className={s.srOnly}>
          Search orders by reference, name or email
        </label>
        <input
          id="order-search"
          type="search"
          value={text}
          placeholder="Reference, name or email"
          className={s.search}
          onChange={(event) => setText(event.target.value)}
        />
      </div>

      <div className={s.selects}>
        <label htmlFor="order-status" className={s.srOnly}>
          Filter by payment status
        </label>
        <select
          id="order-status"
          className={s.select}
          value={status}
          onChange={(event) => apply({ status: event.target.value })}
        >
          <option value="">All payments</option>
          {PAYMENT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <label htmlFor="order-fulfilment" className={s.srOnly}>
          Filter by fulfilment status
        </label>
        <select
          id="order-fulfilment"
          className={s.select}
          value={fulfilment}
          onChange={(event) => apply({ fulfilment: event.target.value })}
        >
          <option value="">All fulfilment</option>
          {FULFILMENT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {FULFILMENT_LABEL[value]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
