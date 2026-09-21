import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, validSession } from "./access";

export async function hasAccess(): Promise<boolean> {
  return validSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireApiAccess(): Promise<Response | null> {
  return await hasAccess() ? null : Response.json({ error: "Introduce la contraseña para continuar." }, { status: 401, headers: { "Cache-Control": "no-store" } });
}
