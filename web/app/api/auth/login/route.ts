import { allowLoginAttempt } from "@/lib/server/login-rate-limit";
import { NextResponse } from "next/server";
import { accessConfigured, createSession, SESSION_COOKIE, sessionCookieOptions, verifyPassword } from "@/lib/server/access";
import { isSameOriginBrowserRequest } from "@/lib/server/push-store";

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) return new Response("Forbidden", { status: 403 });
  if (!accessConfigured()) return Response.json({ error: "El acceso privado aún no está configurado." }, { status: 503 });
  if (Number(request.headers.get("content-length") ?? 0) > 2048) return new Response("Petición demasiado grande", { status: 413 });
  try {
    // Shared Redis limit also protects concurrent serverless instances; fail closed.
    if (!await allowLoginAttempt(request)) return Response.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429, headers: { "Retry-After": "60" } });
    const raw = await request.text();
    if (raw.length > 2048) return new Response("Petición demasiado grande", { status: 413 });
    let body;
    try { body = JSON.parse(raw); }
    catch { return Response.json({ error: "Petición no válida." }, { status: 400 }); }
    if (typeof body?.password !== "string" || !await verifyPassword(body.password)) {
      return Response.json({ error: "Contraseña incorrecta." }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SESSION_COOKIE, createSession(), sessionCookieOptions());
    return response;
  } catch {
    return Response.json({ error: "No se pudo comprobar el acceso. Inténtalo de nuevo más tarde." }, { status: 503 });
  }
}
