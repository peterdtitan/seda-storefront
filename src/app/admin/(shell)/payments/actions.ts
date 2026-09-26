"use server";

import { revalidatePath } from "next/cache";

import { invalidate, TAGS } from "@/lib/admin/cache";

import { reconcile, type Finding } from "@/lib/admin/reconcile";
import { requirePermission } from "@/lib/auth/permissions";

export type ReconcileState =
  | { status: "idle" }
  | { status: "done"; checked: number; findings: Finding[] }
  | { status: "error"; message: string };

export async function runReconciliation(): Promise<ReconcileState> {
  // Recovering an order takes money out of limbo and moves stock, so this is not a
  // read. Finance can see payments; only someone who can move an order can run it.
  const actor = await requirePermission("orders.fulfil");

  try {
    const result = await reconcile();
    invalidate(TAGS.orders, TAGS.analytics);
    revalidatePath("/admin/payments");
    return { status: "done", checked: result.checked, findings: result.findings };
  } catch (error) {
    console.error("[reconcile] failed", { by: actor.email, error });
    return { status: "error", message: "Could not finish. The reason is in the server log." };
  }
}
