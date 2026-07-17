/**
 * DISABLED (2026-07-17) — Do not rename back to middleware.ts until Vercel Edge
 * stops failing with EnvFileReadError → MIDDLEWARE_INVOCATION_FAILED on
 * www.growvisi.in. Confirmed: matcher routes 500; non-matcher routes (/agencies)
 * return 200. Middleware source never reads process.env; failure is platform
 * env-file packaging before our code runs.
 *
 * Auth redirects remain via AuthGuard / GuestGuard in app layouts.
 * Restore by renaming this file to `src/middleware.ts` after a healthy Edge deploy.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "growvisi-session";

function hasSession(request: NextRequest) {
  return request.cookies.get(SESSION_COOKIE)?.value === "1";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loggedIn = hasSession(request);

  if (
    (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")) &&
    !loggedIn
  ) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  const guestRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];
  const inviteFlow =
    pathname.startsWith("/invite") ||
    request.nextUrl.searchParams.has("invite") ||
    request.nextUrl.searchParams.has("token");
  if (
    guestRoutes.some((r) => pathname === r || pathname.startsWith(`${r}/`)) &&
    loggedIn &&
    !inviteFlow
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/invite")) {
    return NextResponse.next();
  }

  if (pathname === "/" && loggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/demo",
    "/contact",
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/invite",
  ],
};
