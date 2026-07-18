import { NextResponse } from "next/server";
import { AUTH_COOKIE, SESSION_SECONDS, gateToken, issueToken, safeEqual } from "@/lib/gate";

export async function POST(req: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return NextResponse.json(
      { error: "APP_PASSWORD is not set on the server. Add it to .env.local (or Vercel env vars) and restart." },
      { status: 500 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const supplied = typeof body.password === "string" ? body.password : "";

  // Compare hashes so the check is constant-time regardless of where the
  // strings first differ, and add friction against online guessing.
  const [a, b] = await Promise.all([gateToken(supplied), gateToken(password)]);
  if (!supplied || !safeEqual(a, b)) {
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await issueToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  return res;
}
