import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const secretKey = process.env.PAYSTACK_SECRET_KEY ?? "";

/** Paystack signs the raw request body with HMAC SHA512 under the secret key.
 *
 * The comparison is constant-time: a plain === leaks how many leading bytes matched,
 * which is enough to forge a signature given enough attempts. The body must be the
 * exact bytes received — parsing and re-serialising changes the hash. */
export function isValidSignature(rawBody: string, signature: string | null): boolean {
  if (!secretKey || !signature) return false;

  const expected = createHmac("sha512", secretKey).update(rawBody, "utf8").digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
