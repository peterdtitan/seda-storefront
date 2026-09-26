import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";

import { neonAdapter } from "@/lib/auth/adapter";
import { sendMagicLink } from "@/lib/auth/email";
import { findUserByEmail, markSignedIn, type Role, type Tier } from "@/lib/auth/store";

const LINK_MINUTES = 15;

declare module "next-auth/adapters" {
  interface AdapterUser {
    tier: Tier;
    roles: Role[];
  }
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      tier: Tier;
      roles: Role[];
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: neonAdapter(),

  // The panel is served from its own subdomain and rewritten to /admin, so the Host
  // header never matches the deployment URL Auth.js would otherwise infer.
  trustHost: true,

  session: {
    strategy: "database",
    // Long enough to cover a working day without signing someone out mid-shift, short
    // enough that a laptop left somewhere is not a way into refunds and payouts.
    maxAge: 12 * 60 * 60,
    updateAge: 60 * 60,
  },

  pages: {
    signIn: "/admin/sign-in",
    verifyRequest: "/admin/sign-in/sent",
    error: "/admin/sign-in",
  },

  providers: [
    Resend({
      // Unused: sendVerificationRequest below does the sending, so that the email
      // carries the brand and so that local development needs no provider at all.
      apiKey: process.env.RESEND_API_KEY ?? "unused",
      maxAge: LINK_MINUTES * 60,
      async sendVerificationRequest({ identifier, url }) {
        // An address with no account gets no email. Auth.js has already written a
        // verification token by this point, which is harmless: without a staff row
        // the signIn callback below refuses it even if the token were guessed.
        const user = await findUserByEmail(identifier);
        if (!user || user.status === "suspended") return;

        await sendMagicLink({ email: identifier, url, expiresMinutes: LINK_MINUTES });
      },
    }),
  ],

  callbacks: {
    // Runs twice per sign-in: once when the link is requested, once when it is opened.
    async signIn({ user, email }) {
      // Requesting one. Refusing here throws AccessDenied, which the form would have
      // to render — and a stranger's address would then look different from a
      // colleague's, turning this page into a staff directory. Let it through and let
      // sendVerificationRequest quietly decline to send.
      if (email?.verificationRequest) return true;

      // Opening one. This is the gate that matters, and nothing gets past it.
      if (!user.email) return false;
      const staff = await findUserByEmail(user.email);
      if (!staff || staff.status === "suspended") return false;
      await markSignedIn(staff.id);
      return true;
    },

    // Everything here came from the adapter's single joined query. This callback runs
    // on every request, so anything it looks up is a round trip on every page.
    async session({ session, user }) {
      session.user = {
        ...user,
        id: String(user.id),
        email: user.email,
        name: user.name ?? null,
        tier: user.tier ?? "staff",
        roles: user.roles ?? [],
      };
      return session;
    },
  },
});
