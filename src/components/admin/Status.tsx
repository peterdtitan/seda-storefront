import { FULFILMENT_LABEL } from "@/lib/admin/orderStatus";

import s from "./status.module.css";

/** One badge for both state machines. Payment and fulfilment read differently but
 * they sit side by side in every list, so they have to look like siblings. */
export function Badge({ kind, value }: { kind: "payment" | "fulfilment"; value: string }) {
  const label = kind === "fulfilment" ? (FULFILMENT_LABEL[value] ?? value) : value;
  return (
    <span className={s.badge} data-kind={kind} data-value={value}>
      {label}
    </span>
  );
}
