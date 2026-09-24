import "server-only";

const BASE = "https://api.paystack.co";

const secretKey = process.env.PAYSTACK_SECRET_KEY ?? "";

export const isPaystackConfigured = secretKey.length > 0;

/** Test keys are sk_test_*, live keys sk_live_*. Worth surfacing, because a live key
 * on a preview would take real money from whoever clicks Checkout. */
export const isLiveKey = secretKey.startsWith("sk_live_");

export type InitialiseResult =
  { ok: true; authorizationUrl: string; reference: string } | { ok: false; message: string };

type PaystackEnvelope<T> = { status: boolean; message: string; data: T };

async function call<T>(path: string, init?: RequestInit): Promise<PaystackEnvelope<T> | null> {
  try {
    const response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
      cache: "no-store",
    });

    const body = (await response.json()) as PaystackEnvelope<T>;
    if (!response.ok) {
      console.error("[paystack] request failed", { path, status: response.status, body });
      return null;
    }
    return body;
  } catch (error) {
    console.error("[paystack] request threw", { path, error });
    return null;
  }
}

export async function initialiseTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<InitialiseResult> {
  if (!isPaystackConfigured) {
    return { ok: false, message: "Card payment is not set up yet." };
  }

  const body = await call<{ authorization_url: string; reference: string }>(
    "/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        // Paystack takes NGN in kobo, which is the unit this codebase already uses,
        // so there is no conversion here and no rounding to get wrong.
        amount: input.amountKobo,
        currency: "NGN",
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: { ...input.metadata, site: "Șèdá" },
      }),
    },
  );

  if (!body?.status || !body.data?.authorization_url) {
    return { ok: false, message: "We could not reach the payment provider." };
  }

  return {
    ok: true,
    authorizationUrl: body.data.authorization_url,
    reference: body.data.reference,
  };
}

export type VerifiedTransaction = {
  status: string;
  reference: string;
  amountKobo: number;
  currency: string;
  paidAt: string | null;
  channel: string | null;
  gatewayResponse: string | null;
};

/** The callback URL is attacker-controlled — anyone can visit it with any reference.
 * Nothing it says is trusted until Paystack confirms it here, server side. */
export async function verifyTransaction(reference: string): Promise<VerifiedTransaction | null> {
  if (!isPaystackConfigured) return null;

  const body = await call<{
    status: string;
    reference: string;
    amount: number;
    currency: string;
    paid_at: string | null;
    channel: string | null;
    gateway_response: string | null;
  }>(`/transaction/verify/${encodeURIComponent(reference)}`);

  if (!body?.status || !body.data) return null;

  return {
    status: body.data.status,
    reference: body.data.reference,
    amountKobo: body.data.amount,
    currency: body.data.currency,
    paidAt: body.data.paid_at,
    channel: body.data.channel,
    gatewayResponse: body.data.gateway_response,
  };
}
