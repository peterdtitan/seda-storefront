"use client";

import { useEffect } from "react";

import { Cta, Outline } from "@/components/ui/Button";
import { StateMessage } from "@/components/ui/StateMessage";
import { STUDIO } from "@/lib/studio";

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is all Vercel's logs will correlate on, so make sure it is written.
    console.error("[storefront] render failed", { digest: error.digest, error });
  }, [error]);

  return (
    <StateMessage
      eyebrow="Something went wrong"
      tone="fault"
      title="We could not load this page"
      as="h1"
      body={
        <>
          This is on us, not on you. Try again — and if it keeps happening, write to{" "}
          <a href={`mailto:${STUDIO.email}`}>{STUDIO.email}</a> and we will sort it out.
        </>
      }
    >
      <Cta onClick={reset}>Try again</Cta>
      <Outline href="/">Back to the home page</Outline>
    </StateMessage>
  );
}
