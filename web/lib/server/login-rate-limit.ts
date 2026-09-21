import { enforceRateLimit } from "./push-store";

const localAttempts = new Map<string, { count: number; until: number }>();

export async function allowLoginAttempt(request: Request): Promise<boolean> {
  // Production always uses a shared counter; missing Redis must not disable it.
  if (process.env.NODE_ENV !== "development") return enforceRateLimit(request, "login", 5);
  const key = request.headers.get("x-forwarded-for") || "local";
  const now = Date.now();
  for (const [ip, entry] of localAttempts) if (entry.until <= now) localAttempts.delete(ip);
  const entry = localAttempts.get(key) ?? { count: 0, until: now + 60_000 };
  entry.count += 1;
  localAttempts.set(key, entry);
  return entry.count <= 5;
}
