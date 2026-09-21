import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scryptSync } from "node:crypto";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { createSession, SESSION_COOKIE } from "@/lib/server/access";

const { allow } = vi.hoisted(() => ({ allow: vi.fn() }));
vi.mock("@/lib/server/login-rate-limit", () => ({ allowLoginAttempt: allow }));
vi.mock("@/lib/server/push-store", () => ({ isSameOriginBrowserRequest: (request: Request) => request.headers.get("origin") === new URL(request.url).origin }));
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";

beforeEach(() => {
  const salt = "0123456789abcdef0123456789abcdef";
  vi.stubEnv("HORADIA_SESSION_SECRET", "a-test-only-secret-with-more-than-32-characters");
  vi.stubEnv("HORADIA_ACCESS_PASSWORD_HASH", `scrypt:${salt}:${scryptSync("fixture-password", salt, 64, { N: 32768, r: 8, p: 1, maxmem: 67108864 }).toString("hex")}`);
  allow.mockResolvedValue(true);
});
afterEach(() => vi.unstubAllEnvs());
const request = (password: string, origin = "https://horadia.test") => new Request("https://horadia.test/api/auth/login", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ password }) });

describe("access endpoints and route guard", () => {
  it("rejects incorrect passwords and cross-origin login", async () => {
    expect((await login(request("wrong"))).status).toBe(401);
    expect((await login(request("fixture-password", "https://other.test"))).status).toBe(403);
  });
  it("sets a persistent HttpOnly cookie after login, then clears it on logout", async () => {
    const response = await login(request("fixture-password"));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=31536000");
    const cleared = await logout(request("unused"));
    expect(cleared.headers.get("set-cookie")).toContain("Max-Age=0");
  });
  it("throttles and fails closed if the shared limiter is unavailable", async () => {
    allow.mockResolvedValue(false);
    expect((await login(request("fixture-password"))).status).toBe(429);
    allow.mockRejectedValue(new Error("Redis offline"));
    expect((await login(request("fixture-password"))).status).toBe(503);
  });
  it("requires access for the app and APIs, including middleware-bypass headers", () => {
    expect(middleware(new NextRequest("https://horadia.test/")).headers.get("location")).toContain("/login");
    expect(middleware(new NextRequest("https://horadia.test/api/push/reminders", { headers: { "x-middleware-subrequest": "middleware" } })).status).toBe(401);
    const allowed = middleware(new NextRequest("https://horadia.test/", { headers: { cookie: `${SESSION_COOKIE}=${createSession()}` } }));
    expect(allowed.headers.get("x-middleware-next")).toBe("1");
    expect(allowed.headers.get("cache-control")).toContain("no-store");
  });
  it("lets signed background jobs reach their own authentication checks", () => {
    for (const path of ["/api/push/deliver", "/api/push/prepare"]) expect(middleware(new NextRequest(`https://horadia.test${path}`)).headers.get("x-middleware-next")).toBe("1");
  });
});
