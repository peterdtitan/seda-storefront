export const EVENTS = {
  pageViewed: "page_viewed",
  productListViewed: "product_list_viewed",
  categoryFiltered: "category_filtered",
  productViewed: "product_viewed",
  lookOpened: "look_opened",
  colourwaySelected: "colourway_selected",
  sizeSelected: "size_selected",
  addedToBag: "added_to_bag",
  removedFromBag: "removed_from_bag",
  bagViewed: "bag_viewed",
  checkoutStarted: "checkout_started",
  paymentSucceeded: "payment_succeeded",
  paymentFailed: "payment_failed",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

export type EventPayload = {
  name: EventName;
  path?: string;
  referrer?: string;
  productId?: string;
  productSlug?: string;
  productName?: string;
  colourway?: string;
  size?: string;
  quantity?: number;
  valueKobo?: number;
  props?: Record<string, unknown>;
};

export type StoredEvent = EventPayload & {
  visitorId: string;
  sessionId: string;
};

const NAMES = new Set<string>(Object.values(EVENTS));

export function isEventName(value: unknown): value is EventName {
  return typeof value === "string" && NAMES.has(value);
}
