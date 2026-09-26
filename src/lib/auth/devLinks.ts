import "server-only";

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type DevLink = { email: string; url: string; at: string };

const FILE = join(process.cwd(), ".dev-magic-links.json");
const KEEP = 10;

export const isDevLinkMode = process.env.NODE_ENV !== "production";

/** A file rather than a module variable: `next dev` serves from more than one worker,
 * so a link written while handling the form post is not necessarily in the same
 * process as the page that wants to show it. */
export function readDevLinks(): DevLink[] {
  if (!isDevLinkMode) return [];
  try {
    const parsed: unknown = JSON.parse(readFileSync(FILE, "utf8"));
    return Array.isArray(parsed) ? (parsed as DevLink[]) : [];
  } catch {
    return [];
  }
}

export function writeDevLink(link: Omit<DevLink, "at">) {
  if (!isDevLinkMode) return;
  try {
    // One row per address, newest only. A spent link is indistinguishable from a live
    // one here — Auth.js hashes the token with AUTH_SECRET before the adapter ever
    // sees it, so the stored hash cannot be derived from the URL without copying that
    // internal. Keeping just the newest sidesteps the question: there is never a
    // stale row to click.
    const others = readDevLinks().filter(
      (existing) => existing.email.toLowerCase() !== link.email.toLowerCase(),
    );
    const next = [{ ...link, at: new Date().toISOString() }, ...others].slice(0, KEEP);
    writeFileSync(FILE, JSON.stringify(next, null, 2));
  } catch (error) {
    console.warn("[auth] could not record the dev magic link", error);
  }
}
