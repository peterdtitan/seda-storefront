"use server";

import { revalidatePath } from "next/cache";

import { invalidate, TAGS } from "@/lib/admin/cache";

import { FULFILMENT_STATUSES, type FulfilmentStatus } from "@/lib/admin/orderStatus";
import { requirePermission } from "@/lib/auth/permissions";
import { retryEmail } from "@/lib/orders/emails";
import { moveFulfilment } from "@/lib/orders/fulfilment";
import type { EmailKind } from "@/lib/email/customer";

export type MoveState =
  { status: "idle" } | { status: "done"; message: string } | { status: "error"; message: string };

export async function changeFulfilment(
  _previous: MoveState,
  formData: FormData,
): Promise<MoveState> {
  // The guard, not the button. A form post is trivially replayable by hand, so the
  // permission is checked here rather than trusted from whatever rendered the page.
  const actor = await requirePermission("orders.fulfil");

  const reference = String(formData.get("reference") ?? "");
  const to = String(formData.get("to") ?? "") as FulfilmentStatus;
  const note = String(formData.get("note") ?? "").trim();

  if (!FULFILMENT_STATUSES.includes(to)) {
    return { status: "error", message: "That is not a fulfilment status." };
  }

  const result = await moveFulfilment({
    reference,
    to,
    actor: { id: actor.id, email: actor.email },
    note: note || undefined,
  });

  if (!result.ok) return { status: "error", message: result.reason };

  invalidate(TAGS.orders, TAGS.analytics);
  revalidatePath(`/admin/orders/${reference}`);

  const said =
    result.email === "sent"
      ? " The customer has been emailed."
      : result.email === "failed"
        ? " The customer could NOT be emailed — see below."
        : result.email === "already"
          ? " They were already emailed about this."
          : "";

  return { status: "done", message: `Moved to ${to.replace(/_/g, " ")}.${said}` };
}

export async function resendEmail(_previous: MoveState, formData: FormData): Promise<MoveState> {
  const actor = await requirePermission("orders.fulfil");

  const reference = String(formData.get("reference") ?? "");
  const kind = String(formData.get("kind") ?? "") as EmailKind;

  const cleared = await retryEmail(reference, kind);
  if (!cleared) {
    return { status: "error", message: "Nothing to retry — that email already went out." };
  }

  const { sendOnce, customerOrder } = await import("@/lib/orders/emails");
  const customer = await customerOrder(reference);
  if (!customer) return { status: "error", message: "That order does not exist." };

  const outcome = await sendOnce(kind, customer);
  invalidate(TAGS.orders);
  revalidatePath(`/admin/orders/${reference}`);

  return outcome === "sent"
    ? { status: "done", message: `Sent. (${actor.email})` }
    : { status: "error", message: "It failed again. The reason is on the order." };
}
