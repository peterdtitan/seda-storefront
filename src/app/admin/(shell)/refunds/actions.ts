"use server";

import { revalidatePath } from "next/cache";

import { invalidate, TAGS } from "@/lib/admin/cache";

import { requirePermission } from "@/lib/auth/permissions";
import { requestRefund } from "@/lib/orders/refunds";

export type RefundState =
  { status: "idle" } | { status: "done"; message: string } | { status: "error"; message: string };

export async function submitRefund(
  _previous: RefundState,
  formData: FormData,
): Promise<RefundState> {
  const actor = await requirePermission("refunds.write");

  const reference = String(formData.get("reference") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const naira = Number(String(formData.get("amount") ?? "").replace(/[^\d.]/g, ""));

  if (reason.length < 3) {
    return { status: "error", message: "Say why. It goes on the record and to Paystack." };
  }
  if (!Number.isFinite(naira) || naira <= 0) {
    return { status: "error", message: "Give an amount in naira." };
  }

  // Naira in, kobo everywhere else. Rounding here rather than trusting a float to
  // land on a whole kobo.
  const amountKobo = Math.round(naira * 100);

  const result = await requestRefund({
    reference,
    amountKobo,
    reason,
    actor: { id: actor.id, email: actor.email },
  });

  if (!result.ok) return { status: "error", message: result.message };

  invalidate(TAGS.orders);
  revalidatePath(`/admin/orders/${reference}`);

  return {
    status: "done",
    message:
      "Paystack has it. The money is not back with the customer until they confirm, which shows here when it happens.",
  };
}
