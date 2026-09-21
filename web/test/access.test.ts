import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scryptSync } from "node:crypto";
import { accessConfigured, createSession, SESSION_MAX_AGE, sessionCookieOptions, validSession, verifyPassword } from "@/lib/server/access";

beforeEach(() => {
  vi.stubEnv("HORADIA_SESSION_SECRET", "test-session-secret-with-at-least-32-characters");
  const salt = "0123456789abcdef0123456789abcdef";
  const digest = scryptSync("test-password-only", salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString("hex");
  vi.stubEnv("HORADIA_ACCESS_PASSWORD_HASH", `scrypt:${salt}:${digest}`);
});
afterEach(() => vi.unstubAllEnvs());

describe("private device access", () => {
  it("verifies the salted server hash and rejects wrong or oversized passwords", async () => {
    expect(await verifyPassword("test-password-only")).toBe(true);
    expect(await verifyPassword("wrong")).toBe(false);
    expect(await verifyPassword("x".repeat(257))).toBe(false);
  });
  it("remembers a device and rejects tampered or expired sessions", () => {
    const now = Date.now();
    const session = createSession(now);
    expect(validSession(session, now + 30 * 86400000)).toBe(true);
    expect(validSession(session + "0", now)).toBe(false);
    expect(validSession(session.replace(/.$/, session.endsWith("a") ? "b" : "a"), now)).toBe(false);
    expect(validSession(session, now + SESSION_MAX_AGE * 1000)).toBe(false);
    expect(validSession(undefined)).toBe(false);
  });
  it("invalidates all devices when the signing secret is rotated", () => {
    const session = createSession();
    vi.stubEnv("HORADIA_SESSION_SECRET", "another-test-secret-with-at-least-32-characters");
    expect(validSession(session)).toBe(false);
  });
  it("fails closed without configuration", async () => {
    vi.stubEnv("HORADIA_ACCESS_PASSWORD_HASH", "");
    expect(accessConfigured()).toBe(false);
    expect(validSession(createSession())).toBe(false);
    await expect(verifyPassword("anything")).rejects.toThrow();
  });
  it("uses a secure persistent HttpOnly cookie in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(sessionCookieOptions()).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE });
  });
});
