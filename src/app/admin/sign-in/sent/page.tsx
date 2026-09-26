import type { Metadata } from "next";
import Link from "next/link";

import s from "../signin.module.css";

export const metadata: Metadata = { title: "Check your email" };

export default function LinkSentPage() {
  return (
    <main className={s.page}>
      <div className={s.card}>
        <span className={s.mark}>ȘÈDÁ</span>
        <h1 className={s.title}>Check your email</h1>
        {/* Deliberately unconditional. Saying "if that address is on the team" here
            would confirm the opposite when it is, so the page says the same thing
            either way. */}
        <p className={s.lede}>
          If that address belongs to a team member, a sign-in link is on its way. It works once and
          expires in fifteen minutes.
        </p>
        <Link href="/admin/sign-in" className={s.back}>
          Use a different address
        </Link>
      </div>
    </main>
  );
}
