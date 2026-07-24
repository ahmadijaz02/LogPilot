import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Protects the authenticated app and enforces the two-role access model:
 *  - Only fleet managers may reach /fleet, /manager and /analytics-fleet
 *  - Only drivers may reach the log editor (/log) and driver-only pages
 * Unauthenticated users are redirected to /login by withAuth.
 */
const DRIVER_ONLY = [
  "/dashboard",
  "/log",
  "/weekly",
  "/history",
  "/analytics",
  "/reports",
  "/profile",
];
const MANAGER_ONLY = ["/fleet"];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role;

    if (MANAGER_ONLY.some((p) => pathname.startsWith(p)) && role !== "FLEET_MANAGER") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (DRIVER_ONLY.some((p) => pathname.startsWith(p)) && role !== "DRIVER") {
      return NextResponse.redirect(new URL("/fleet", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  },
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/log/:path*",
    "/weekly/:path*",
    "/history/:path*",
    "/analytics/:path*",
    "/reports/:path*",
    "/fleet/:path*",
    "/profile/:path*",
    "/settings/:path*",
  ],
};
