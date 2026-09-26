import "server-only";

import { shell } from "@/lib/email/layout";
import { isDevelopment, isEmailConfigured, sendEmail } from "@/lib/email/send";

import { writeDevLink } from "./devLinks";

export { isEmailConfigured };

export async function sendMagicLink(input: { email: string; url: string; expiresMinutes: number }) {
  // Without a provider the link goes to the terminal and to .dev-magic-links.json,
  // which /admin/sign-in/dev reads. Local development should not need a mail provider.
  if (!isEmailConfigured && isDevelopment) {
    writeDevLink({ email: input.email, url: input.url });
    console.info(
      `\n[auth] No RESEND_API_KEY, so nothing was emailed.\n[auth] Link for ${input.email}:\n${input.url}\n[auth] Or open http://localhost:3000/admin/sign-in/dev\n`,
    );
    return;
  }

  const html = shell({
    heading: "Sign in to the Șèdá admin",
    body:
      `<p style="margin:0 0 12px;">Use the button below to sign in. The link works once and expires in ${input.expiresMinutes} minutes.</p>` +
      `<p style="margin:0;">If you did not ask to sign in, ignore this email. Nothing happens until the link is opened.</p>`,
    action: { href: input.url, label: "Sign in" },
  });

  await sendEmail({
    to: input.email,
    subject: "Sign in to the Șèdá admin",
    html,
    text: [
      "Sign in to the Șèdá admin",
      "",
      input.url,
      "",
      `The link works once and expires in ${input.expiresMinutes} minutes.`,
      "If you did not ask to sign in, ignore this email.",
    ].join("\n"),
  });
}
