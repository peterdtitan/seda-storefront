import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { readDevLinks } from "@/lib/auth/devLinks";

import s from "../signin.module.css";

export const metadata: Metadata = { title: "Dev sign-in links" };

export const dynamic = "force-dynamic";

/** Stands in for an inbox until Resend has a verified domain.
 *
 * Same guard as /styleguide: the production build 404s it. It only ever has anything
 * to show when RESEND_API_KEY is unset, and in production a missing key throws rather
 * than writing a link anywhere. */
export default async function DevLinksPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const links = readDevLinks();

  return (
    <main className={s.page}>
      <div className={s.card}>
        <span className={s.mark}>ȘÈDÁ</span>
        <h1 className={s.title}>Sign-in links</h1>
        <p className={s.lede}>
          Development only. The newest link for each address, as it would have been emailed.
        </p>

        {links.length === 0 ? (
          <p className={s.note}>
            Nothing yet. Request one from <Link href="/admin/sign-in">the sign-in form</Link>, then
            reload this page.
          </p>
        ) : (
          <ol className={s.links}>
            {links.map((link) => (
              <li key={link.email} className={s.linkRow}>
                <span className={s.linkWho}>{link.email}</span>
                <time className={s.linkWhen} dateTime={link.at}>
                  {new Date(link.at).toLocaleTimeString("en-GB")}
                </time>
                <a href={link.url} className={s.linkOpen}>
                  Sign in
                </a>
              </li>
            ))}
          </ol>
        )}

        <p className={s.note}>
          Each link works once. Request another from the form and this row is replaced.
        </p>

        <Link href="/admin/sign-in" className={s.back}>
          Back to sign-in
        </Link>
      </div>
    </main>
  );
}
