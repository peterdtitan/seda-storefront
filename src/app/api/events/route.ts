import { NextResponse } from "next/server";

import { parseEvents, recordEvents } from "@/lib/analytics/record";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const events = parseEvents(body);

  // Telemetry never tells the client it failed. A rejected batch would only teach an
  // ad blocker to retry, and a shopper gains nothing from the error.
  await recordEvents(events, {
    country: request.headers.get("x-vercel-ip-country") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return new NextResponse(null, { status: 204 });
}
