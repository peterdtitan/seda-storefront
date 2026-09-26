import "server-only";

import type { FunnelCounts, ProductRanking } from "./reports";
import type { CategoryRow, Duration, PathRow, SalesPoint } from "./insights";

export type Step = {
  /** act = do this today. watch = keep an eye. good = worth knowing it is working. */
  tone: "act" | "watch" | "good";
  title: string;
  why: string;
  /** What to actually do. Not a restatement of the number above it. */
  todo: string;
  href?: string;
};

const percent = (value: number) => `${Math.round(value * 100)}%`;

/**
 * Turns the numbers into things to do.
 *
 * Every rule here states a threshold and the action it implies, because a dashboard
 * that only reports leaves the reader to guess what good looks like. Thresholds are
 * deliberately conservative for a small label with short runs — the advice is "cut
 * more of this" rather than anything that assumes scale.
 *
 * Nothing fires without enough evidence to mean it. Below the sample floors a rule
 * says nothing at all rather than calling a two-visit fluke a trend.
 */
export function nextSteps(input: {
  funnel: FunnelCounts;
  products: ProductRanking[];
  categories: CategoryRow[];
  paths: PathRow[];
  duration: Duration;
  sales: SalesPoint[];
  sessions: number;
}): Step[] {
  const { funnel, products, categories, paths, duration, sales, sessions } = input;
  const steps: Step[] = [];

  // --- the funnel, largest leak first ---
  const bagToCheckout = funnel.bagViews > 0 ? funnel.checkoutsStarted / funnel.bagViews : 0;
  const checkoutToPaid =
    funnel.checkoutsStarted > 0 ? funnel.ordersPaid / funnel.checkoutsStarted : 0;
  const viewToBag = funnel.productViews > 0 ? funnel.addsToBag / funnel.productViews : 0;

  if (funnel.checkoutsStarted >= 5 && checkoutToPaid < 0.5) {
    steps.push({
      tone: "act",
      title: "People reach Paystack and do not pay",
      why: `Only ${percent(checkoutToPaid)} of started checkouts finished. That is the most expensive place to lose someone — they had decided.`,
      todo: "Open Payments and run the Paystack check: some of those may have paid without the webhook arriving. If they genuinely dropped, the cause is usually the card form, not the price.",
      href: "/admin/payments",
    });
  }

  if (funnel.bagViews >= 10 && bagToCheckout < 0.3) {
    steps.push({
      tone: "act",
      title: "Bags are filled and abandoned",
      why: `${percent(bagToCheckout)} of bag views turned into a checkout. Delivery cost and delivery time are what people look for at this step.`,
      todo: "Say the Lagos delivery terms on the bag page rather than at checkout. People leave to find out, and do not come back.",
    });
  }

  if (funnel.productViews >= 30 && viewToBag < 0.06) {
    steps.push({
      tone: "watch",
      title: "Pieces are looked at but not wanted",
      why: `${percent(viewToBag)} of product views led to a bag. Under about 6% usually means the photography or the size guidance is doing the work the copy should.`,
      todo: "Take one piece with traffic and a weak rate, and add a worn-on-body shot and a measured fit note. Compare it against the others in a fortnight.",
    });
  }

  // --- stock against demand ---
  const wanted = products
    .filter((product) => product.views >= 12 && product.addToBagRate >= 0.15)
    .slice(0, 2);
  for (const product of wanted) {
    steps.push({
      tone: "good",
      title: `${product.productName} is converting`,
      why: `${percent(product.addToBagRate)} of the people who look at it put it in a bag, across ${product.views} views. That is well above a normal rate.`,
      todo: "Check what is left in the Studio and cut more before the run ends. This is the piece to put behind any spend.",
      href: "/studio",
    });
  }

  const ignored = products
    .filter((product) => product.views >= 25 && product.addToBagRate < 0.03)
    .slice(0, 1);
  for (const product of ignored) {
    steps.push({
      tone: "watch",
      title: `${product.productName} draws views and nothing else`,
      why: `${product.views} views, ${product.addsToBag} added. Traffic is arriving and leaving.`,
      todo: "Either the price is wrong for what the photographs promise, or the photographs are. Change one of the two, not both, so you learn which.",
    });
  }

  // --- which category earns the front page ---
  const best = bestCategory(categories);
  const worstCategory = categories
    .filter((row) => row.views >= 15)
    .sort((a, b) => a.rate - b.rate)[0];

  if (
    best &&
    worstCategory &&
    best.category !== worstCategory.category &&
    best.rate > worstCategory.rate * 2
  ) {
    steps.push({
      tone: "act",
      title: `${best.category} converts far better than ${worstCategory.category}`,
      why: `${percent(best.rate)} of ${best.category} views end in a bag, against ${percent(worstCategory.rate)} for ${worstCategory.category}. Both are getting looked at.`,
      todo: `Lead the shop and the next drop with ${best.category}. The other is earning attention it is not converting.`,
      href: "/admin/orders",
    });
  }

  // --- where attention goes ---
  const shop = paths.find((row) => row.path === "/shop");
  const lookbook = paths.find((row) => row.path === "/lookbook");
  if (shop && lookbook && lookbook.views > shop.views * 1.3 && lookbook.views >= 20) {
    steps.push({
      tone: "act",
      title: "The lookbook outdraws the shop",
      why: `${lookbook.views} lookbook views against ${shop.views} on the shop. People are treating it as the front door.`,
      todo: "Put a direct route from each look to the pieces in it. Right now the lookbook ends in admiration rather than a bag.",
    });
  }

  // --- how long they stay ---
  if (sessions >= 20 && duration.bounceRate > 0.6) {
    steps.push({
      tone: "act",
      title: "Most visits are a single page",
      why: `${percent(duration.bounceRate)} of sessions never reached a second page. Either the landing does not say what this is, or the traffic is the wrong traffic.`,
      todo: "Tag your links with ?utm_source= so this screen can tell you which source bounces. Fixing the page is guesswork until then.",
    });
  } else if (sessions >= 20 && duration.medianSeconds >= 90) {
    steps.push({
      tone: "good",
      title: "People are reading",
      why: `A median visit runs ${Math.round(duration.medianSeconds / 60)} minutes across ${duration.pagesPerSession.toFixed(1)} pages. That is browsing, not bouncing.`,
      todo: "Attention is not the problem. Spend the effort on the checkout step instead.",
    });
  }

  // --- the trend ---
  const half = Math.floor(sales.length / 2);
  const earlier = sales.slice(0, half).reduce((total, day) => total + day.revenueKobo, 0);
  const later = sales.slice(half).reduce((total, day) => total + day.revenueKobo, 0);
  if (earlier > 0 && later < earlier * 0.6) {
    steps.push({
      tone: "watch",
      title: "Sales are down on the previous fortnight",
      why: "The second half of the period took noticeably less than the first.",
      todo: "Check whether anything sold out. A falling number with an empty size chart is a supply problem, not a demand one.",
      href: "/admin/orders",
    });
  }

  // --- the empty case, which is itself a next step ---
  if (steps.length === 0) {
    steps.push({
      tone: "watch",
      title: "Not enough traffic to advise on",
      why: `${sessions} ${sessions === 1 ? "session" : "sessions"} in the period. Any rate drawn from that would be noise dressed as a finding.`,
      todo: "Tag the links you share with ?utm_source= and ?utm_campaign=. When visits arrive, this screen can say which ones were worth it.",
    });
  }

  // Act first, then watch, then the things already going well.
  const order = { act: 0, watch: 1, good: 2 };
  return steps.sort((a, b) => order[a.tone] - order[b.tone]).slice(0, 6);
}

/** Only ever used against a category list with real traffic behind it. */
export function bestCategory(categories: CategoryRow[]): CategoryRow | null {
  const eligible = categories.filter((row) => row.views >= 15);
  if (eligible.length < 2) return null;
  return eligible.reduce((best, row) => (row.rate > best.rate ? row : best));
}
