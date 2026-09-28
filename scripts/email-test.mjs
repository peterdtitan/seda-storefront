// Proves the mail setup before anything depends on it.
//
// Email fails quietly: a key that works will still refuse to send from a domain
// Resend has not verified, and an unverified domain looks fine in the dashboard right
// up until the DNS has actually propagated. This checks the key, reports what Resend
// thinks of your domain, then sends a real message.
//
//   pnpm email:test you@example.com

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Resend } from "resend";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    const match = readFileSync(join(root, ".env.local"), "utf8").match(
      new RegExp(`^${name}=(.*)$`, "m"),
    );
    if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    /* no .env.local is fine, the variable may be exported */
  }
  return "";
}

function die(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

const apiKey = env("RESEND_API_KEY");
const from = env("EMAIL_FROM") || "Șèdá <onboarding@resend.dev>";
const to = process.argv[2];

if (!to) die("Who should it go to?  pnpm email:test you@example.com");
if (!apiKey) die("RESEND_API_KEY is not set in .env.local.");

const resend = new Resend(apiKey);

// The SDK prints its own [Resend API Error] dump on every failure, which repeats what
// this script is about to say in a less useful form. Silenced around the calls so the
// output is the diagnosis and nothing else.
async function quietly(run) {
  const noise = console.error;
  console.error = () => {};
  try {
    return await run();
  } finally {
    console.error = noise;
  }
}
const sender = from.match(/<([^>]+)>/)?.[1] ?? from;
const domain = sender.split("@")[1] ?? "";

console.log(`
  from    ${from}
  to      ${to}
`);

// What Resend believes about the sending domain. Worth asking before the send,
// because "not verified" and "verified but DNS has not propagated" produce the same
// rejection and very different next steps.
if (domain === "resend.dev") {
  console.log("  domain  resend.dev — Resend's shared test sender.");
  console.log("          It only delivers to the address that owns the Resend account.");
} else {
  const { data, error } = await quietly(() => resend.domains.list());
  if (error) {
    // A bad key fails here first. Saying so once, now, beats a second identical
    // failure from the send a moment later.
    if (/API key is invalid|unauthorized|401/i.test(error.message)) {
      die(
        "Resend rejected the API key. Check it was copied whole, and that it has not been revoked.",
      );
    }
    console.log(`  domain  could not list domains: ${error.message}`);
  } else {
    const all = Array.isArray(data) ? data : (data?.data ?? []);
    const match = all.find((d) => d.name === domain);
    if (!match) {
      console.log(`  domain  ${domain} is NOT added to this Resend account.`);
      console.log(`          Add it under Domains, or send from onboarding@resend.dev for now.`);
    } else {
      console.log(
        `  domain  ${domain} — ${match.status}${match.region ? ` (${match.region})` : ""}`,
      );
      if (match.status !== "verified") {
        console.log("          Not verified yet, so the send below will be refused.");
        console.log("          DNS can take a while; re-run this once it has propagated.");
      }
    }
  }
}

/** Turns Resend's message into the thing to actually go and change. */
function explain(message) {
  const m = String(message);
  if (/API key is invalid|unauthorized|401/i.test(m)) {
    return "Resend rejected the API key. Check it was copied whole, and that it has not been revoked.";
  }
  if (/domain is not verified|not verified/i.test(m)) {
    return `${domain} is not verified in Resend yet. Add its DNS records, wait for propagation, then re-run.`;
  }
  if (/testing emails to your own|own email address/i.test(m)) {
    return [
      "Resend only lets the shared onboarding@resend.dev sender reach the address that owns",
      "  the account. Either send this test to that address, or verify your own domain and set",
      "  EMAIL_FROM to something on it.",
    ].join("\n  ");
  }
  if (/rate|429/i.test(m)) return "Rate limited by Resend. Wait a moment and try again.";
  return m;
}

const { data, error } = await quietly(() =>
  resend.emails.send({
    from,
    to,
    subject: "Șèdá — email test",
    text: "If you are reading this, the shop can send email.\n\nNothing else to do.",
    html: '<p style="font-family:system-ui">If you are reading this, the shop can send email.</p><p style="font-family:system-ui;color:#666">Nothing else to do.</p>',
  }),
);

if (error) die(`Resend refused it.\n\n  ${explain(error.message)}`);

console.log(`\n  sent — id ${data?.id ?? "unknown"}`);
console.log(`\n  Check ${to}, including the spam folder. Landing in spam usually means`);
console.log("  SPF or DKIM is missing — or that two SPF records exist, which invalidates both.\n");
