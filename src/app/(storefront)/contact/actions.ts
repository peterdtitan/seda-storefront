"use server";

import { headers } from "next/headers";

import { sql } from "@/lib/analytics/db";

export type ContactState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "error"; message: string; fields?: Record<string, string> };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function submitContactRequest(
  _previous: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  // Bots fill every field they find; a human never sees this one.
  if (String(formData.get("company") ?? "").length > 0) return { status: "sent" };

  const fields = { name, email, message };

  if (name.length < 1 || name.length > 120) {
    return { status: "error", message: "Tell us your name.", fields };
  }
  if (!EMAIL.test(email) || email.length > 254) {
    return { status: "error", message: "That email address does not look right.", fields };
  }
  if (message.length < 1 || message.length > 4000) {
    return {
      status: "error",
      message: message.length ? "That message is too long." : "Add a message.",
      fields,
    };
  }

  // Unlike analytics, a dropped message is a person who thinks they reached us and
  // did not. Say so rather than showing a false confirmation.
  if (!sql) {
    return {
      status: "error",
      message: "We could not send that. Email wearsedastudio@gmail.com and we will reply.",
      fields,
    };
  }

  try {
    const head = await headers();
    await sql`
      insert into contact_requests (name, email, message, country, user_agent)
      values (
        ${name},
        ${email},
        ${message},
        ${head.get("x-vercel-ip-country")},
        ${head.get("user-agent")?.slice(0, 512) ?? null}
      )
    `;
    return { status: "sent" };
  } catch (error) {
    console.error("[contact] insert failed", error);
    return {
      status: "error",
      message: "We could not send that. Email wearsedastudio@gmail.com and we will reply.",
      fields,
    };
  }
}
