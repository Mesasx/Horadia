import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/server/access";
import { isSameOriginBrowserRequest } from "@/lib/server/push-store";

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) return new Response("Forbidden", { status: 403 });
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store", "Clear-Site-Data": '"cache"' } });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
