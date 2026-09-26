import { NextResponse, type NextRequest } from "next/server";

/**
 * Serves the admin from its own hostname without a second deployment.
 *
 * `admin.<domain>/orders` is rewritten to `/admin/orders`, and `/admin/*` keeps
 * working everywhere so links can be written one way. On the storefront's own hostname
 * the admin does not exist at all.
 */

function isAdminHost(host: string): boolean {
  return host.startsWith("admin.");
}

// A preview and a laptop have one hostname between them and no admin subdomain, so the
// panel has to be reachable at /admin there or it cannot be worked on at all.
function isDevelopmentHost(host: string): boolean {
  return (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("0.0.0.0") ||
    host.endsWith(".vercel.app")
  );
}

export function middleware(request: NextRequest) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(":")[0]
    .toLowerCase();
  const { pathname } = request.nextUrl;

  if (isAdminHost(host)) {
    // Auth.js builds its callback URLs from the request, so rewriting /api/auth would
    // send the magic link's callback to a route that does not exist.
    if (
      pathname.startsWith("/api") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/superuser")
    ) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/admin" : `/admin${pathname}`;
    return NextResponse.rewrite(url);
  }

  // The storefront's hostname. Orders, payouts and staff have no business answering
  // here, and a 404 says less than a redirect would.
  if (
    (pathname.startsWith("/admin") || pathname.startsWith("/superuser")) &&
    !isDevelopmentHost(host)
  ) {
    return NextResponse.rewrite(new URL("/not-found", request.url), { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  // Static assets and image optimisation never need any of this.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo/|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
