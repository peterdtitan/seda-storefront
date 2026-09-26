import "server-only";

import { cache } from "react";
import { unstable_cache, updateTag } from "next/cache";

/**
 * Report caching.
 *
 * Every query in this admin is a round trip to Neon in another continent, at roughly
 * 200ms each, and a dashboard asks five or six questions to draw one screen. None of
 * those answers change between two people opening the same page a second apart.
 *
 * Tagged rather than purely time-based: an order moving has to show immediately, or
 * someone marks a parcel despatched and the queue still says otherwise.
 */
export const TAGS = {
  orders: "admin:orders",
  analytics: "admin:analytics",
  staff: "admin:staff",
} as const;

export type Tag = (typeof TAGS)[keyof typeof TAGS];

/** Short by design. A stale figure on a dashboard is tolerable for a few seconds; a
 * stale one for a minute gets someone to reload and distrust the screen. */
const SECONDS = {
  "admin:orders": 15,
  "admin:analytics": 120,
  "admin:staff": 30,
} as const;

/**
 * Two layers, because they solve different problems.
 *
 * unstable_cache keeps the answer between requests. React's cache keeps it within
 * one: three sections of the analytics page each ask for the funnel, and on a cold
 * cache that was three identical round trips inside a single render.
 */
export function cached<Args extends unknown[], Result>(
  key: string,
  tag: Tag,
  fn: (...args: Args) => Promise<Result>,
) {
  const persisted = unstable_cache(fn, [key], { tags: [tag], revalidate: SECONDS[tag] });
  return cache(persisted);
}

/** Called by anything that writes.
 *
 * updateTag rather than revalidateTag: it gives read-your-own-writes inside the same
 * server action, so the admin who just marked a parcel despatched sees it on the very
 * next render rather than a cached screen that disagrees with them. */
export function invalidate(...tags: Tag[]) {
  for (const tag of tags) updateTag(tag);
}
