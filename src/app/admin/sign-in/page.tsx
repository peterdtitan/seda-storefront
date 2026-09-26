import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isEmailConfigured } from "@/lib/auth/email";

import { SignInForm } from "./SignInForm";
import s from "./signin.module.css";

export const metadata: Metadata = { title: "Sign in" };

export const dynamic = "force-dynamic";

// Auth.js puts its own codes on the query string when a callback fails. Left as-is a
// used or expired link just re-renders a bare form, which reads as "nothing happened".
const REASONS: Record<string, string> = {
  Verification: "That link has already been used, or it has expired. Here is a fresh one.",
  AccessDenied: "That account cannot sign in. Ask an owner to check it.",
  Configuration: "Sign-in is misconfigured. Tell the developer.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/admin");

  const { error } = await searchParams;
  const reason = error ? (REASONS[error] ?? "Something went wrong. Try again.") : null;

  return (
    <main className={s.page}>
      <div className={s.card}>
        <span className={s.mark}>ȘÈDÁ</span>
        <h1 className={s.title}>Sign in</h1>
        <p className={s.lede}>We will email you a link. There is no password to remember.</p>

        {reason && (
          <p className={s.error} role="alert">
            {reason}
          </p>
        )}

        <SignInForm />

        <p className={s.note}>
          Accounts are created by invitation. If your address is not on the team, no email is sent.
        </p>

        {/* Only while there is no mail provider. The page it points at does not exist
            in a production build. */}
        {!isEmailConfigured && process.env.NODE_ENV !== "production" && (
          <p className={s.devHint}>
            No mail provider configured, so nothing is actually sent. The link appears at{" "}
            <Link href="/admin/sign-in/dev">/admin/sign-in/dev</Link>.
          </p>
        )}
      </div>
    </main>
  );
}
