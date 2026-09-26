"use server";

import { unstable_rethrow } from "next/navigation";

import { signIn } from "@/auth";

export type SignInState = { status: "idle" } | { status: "error"; message: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function requestLink(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .slice(0, 254);

  if (!EMAIL.test(email)) {
    return { status: "error", message: "That does not look like an email address." };
  }

  try {
    // redirectTo is where the browser lands after the link is *opened*, not after it
    // is requested. Requesting one goes to pages.verifyRequest.
    await signIn("resend", { email, redirectTo: "/admin" });
  } catch (error) {
    // signIn signals its redirect by throwing, so that one has to go back up. Anything
    // else is a real failure, and the message stays vague either way: whether an
    // address belongs to staff is not something this form should confirm.
    unstable_rethrow(error);
    console.error("[auth] could not start sign-in", error);
    return { status: "error", message: "We could not send the link. Please try again." };
  }

  return { status: "idle" };
}
