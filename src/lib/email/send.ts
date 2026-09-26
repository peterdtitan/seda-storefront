import "server-only";

import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY ?? "";
const from = process.env.EMAIL_FROM || "Șèdá <onboarding@resend.dev>";

export const isEmailConfigured = apiKey.length > 0;
export const isDevelopment = process.env.NODE_ENV !== "production";

const resend = isEmailConfigured ? new Resend(apiKey) : null;

export type Sent = { providerId: string };

/**
 * One way out for every email the app sends.
 *
 * Without a key in development nothing is sent and the caller is told so plainly:
 * a swallowed send looks identical to a lost email. In production a missing key
 * throws instead, because the alternative is a customer silently never hearing back.
 */
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<Sent> {
  if (!resend) {
    if (!isDevelopment) {
      throw new Error("RESEND_API_KEY is not set, so no email can be sent.");
    }
    console.info(`\n[email] would send to ${input.to}: ${input.subject}\n`);
    return { providerId: "dev:console" };
  }

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) throw new Error(`Resend refused it: ${error.message}`);
  return { providerId: data?.id ?? "unknown" };
}
