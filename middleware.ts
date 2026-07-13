import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, gateToken, safeEqual } from "@/lib/gate";

// Single-user password gate. Every page and API route requires the auth cookie
// (an HMAC-style hash of APP_PASSWORD). Scheduled jobs authenticate with
// CRON_SECRET instead. Multi-user Supabase Auth + per-user RLS is the upgrade
// path if this ever becomes shared.

const CRON_PATHS = ["/api/import-swelist", "/api/import-ats", "/api/reminders"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Vercel Cron (or curl) can call the scheduled endpoints with
  // "Authorization: Bearer $CRON_SECRET" instead of the cookie.
  const cron = process.env.CRON_SECRET;
  if (cron && CRON_PATHS.includes(pathname)) {
    const header = req.headers.get("authorization") || "";
    if (safeEqual(header, "Bearer " + cron)) return NextResponse.next();
  }

  const password = process.env.APP_PASSWORD;
  if (!password) {
    // Local development convenience: no password set -> no gate.
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    // Production: fail CLOSED. Never serve the app unprotected by accident.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "APP_PASSWORD is not configured on the server." }, { status: 503 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const cookie = req.cookies.get(AUTH_COOKIE)?.value || "";
  const expected = await gateToken(password);
  if (safeEqual(cookie, expected)) return NextResponse.next();

  // API calls get a 401; pages get redirected to the login screen. The
  // destination rides along in ?next= so e.g. a bookmarklet capture that hits
  // the gate still lands on the pre-filled form after signing in.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search =
    pathname && pathname !== "/"
      ? "?next=" + encodeURIComponent(pathname + (req.nextUrl.search || ""))
      : "";
  return NextResponse.redirect(url);
}

export const config = {
  // Protect everything except the login screen, its API, and static assets.
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico).*)"],
};
