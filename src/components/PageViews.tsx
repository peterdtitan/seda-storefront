"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";

/** One page_viewed per navigation, including client-side route changes. */
export function PageViews() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    track(EVENTS.pageViewed);
  }, [pathname]);

  return null;
}
