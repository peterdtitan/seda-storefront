/** The announcement bar's shape and its scheduling rule.
 *
 * Deliberately not in the component file. That one is "use client", and everything
 * exported from a client module — including a plain function — can only be called on
 * the client. The layout is a server component and needs to decide whether to render
 * the bar at all, so the rule lives here where both sides can reach it.
 */

export type AnnouncementCopy = {
  enabled?: boolean;
  message?: string;
  linkLabel?: string;
  linkHref?: string;
  startsAt?: string;
  endsAt?: string;
};

/** Decided on the server, so a wrong clock on someone's laptop cannot surface an
 * announcement early or keep an expired one up. */
export function isLive(copy: AnnouncementCopy | null, now = new Date()): boolean {
  if (!copy?.enabled || !copy.message?.trim()) return false;
  if (copy.startsAt && new Date(copy.startsAt) > now) return false;
  if (copy.endsAt && new Date(copy.endsAt) < now) return false;
  return true;
}
