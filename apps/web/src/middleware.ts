import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "revenue-os-session";

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
  if (guestRoutes.some((r) => pathname === r || pathname.startsWith(`${r}/`)) && loggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname === "/" && loggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
