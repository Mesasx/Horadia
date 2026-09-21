import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-horadia-access" : "horadia-access";
export const SESSION_MAX_AGE = 365 * 24 * 60 * 60;

function sessionSecret(): string {
  const secret = process.env.HORADIA_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Acceso privado no configurado.");
  return secret;
}

export function accessConfigured(): boolean {
  return Boolean(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(process.env.HORADIA_ACCESS_PASSWORD_HASH ?? "") && process.env.HORADIA_SESSION_SECRET && process.env.HORADIA_SESSION_SECRET.length >= 32);
}

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.HORADIA_ACCESS_PASSWORD_HASH ?? "";
  const [scheme, salt, digest] = hash.split(":");
  if (scheme !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(digest ?? "")) {
    throw new Error("Acceso privado no configurado.");
  }
  if (!password || password.length > 256) return false;
  const actual = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key));
  });
  return timingSafeEqual(actual, Buffer.from(digest, "hex"));
}

export function createSession(now = Date.now()): string {
  const payload = `${Math.floor(now / 1000) + SESSION_MAX_AGE}.${randomBytes(24).toString("hex")}`;
  return `${payload}.${createHmac("sha256", sessionSecret()).update(payload).digest("hex")}`;
}

export function validSession(token: string | undefined, now = Date.now()): boolean {
  if (!token || !accessConfigured()) return false;
  const match = /^(\d{10})\.([a-f0-9]{48})\.([a-f0-9]{64})$/.exec(token);
  if (!match || Number(match[1]) <= Math.floor(now / 1000)) return false;
  const signature = createHmac("sha256", sessionSecret()).update(`${match[1]}.${match[2]}`).digest();
  return timingSafeEqual(signature, Buffer.from(match[3], "hex"));
}

export function sessionCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: SESSION_MAX_AGE };
}
