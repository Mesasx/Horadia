import { NextRequest, NextResponse } from "next/server";
import { createSession, SESSION_COOKIE, sessionCookieOptions, validSession } from "@/lib/server/access";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // Background jobs have their own signature / secret checks in their handlers.
  if (path === "/api/push/deliver" || path === "/api/push/prepare" || path.startsWith("/api/auth/")) return NextResponse.next();
  const authenticated = validSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (path === "/login") return authenticated ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  if (!authenticated) {
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Acceso privado." }, { status: 401 });
    const login = new URL("/login", request.url);
    login.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  // Renew at most daily, so normal use never asks again due to session age.
  const expires = Number(request.cookies.get(SESSION_COOKIE)!.value.split(".")[0]);
  if (expires - Date.now() / 1000 < 364 * 24 * 60 * 60) {
    response.cookies.set(SESSION_COOKIE, createSession(), sessionCookieOptions());
  }
  return response;
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|icon-maskable-512.png|apple-touch-icon.png|manifest.webmanifest|sw.js).*)"],
};
