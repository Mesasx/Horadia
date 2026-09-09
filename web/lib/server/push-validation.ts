import "server-only";

import type {
  ReminderScheduleInput,
  StoredPushSubscription,
} from "./push-store";

const OFFSETS = new Set([null, 0, 15, 30, 60, 1_440]);

export function parsePushSubscription(
  value: unknown,
): StoredPushSubscription | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const keys = input.keys as Record<string, unknown> | undefined;
  if (
    typeof input.endpoint !== "string" ||
    !input.endpoint.startsWith("https://") ||
    !keys ||
    typeof keys.p256dh !== "string" ||
    typeof keys.auth !== "string" ||
    keys.p256dh.length < 20 ||
    keys.auth.length < 8
  ) {
    return null;
  }
  return {
    endpoint: input.endpoint,
    expirationTime:
      typeof input.expirationTime === "number" ? input.expirationTime : null,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
  };
}

export function parseReminderSchedule(
  value: unknown,
): ReminderScheduleInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const offset = input.notificationOffset;
  const notifyAt = input.notifyAt;
  if (
    typeof input.id !== "string" ||
    !/^[A-Za-z0-9_-]{1,100}$/.test(input.id) ||
    typeof input.title !== "string" ||
    input.title.trim().length === 0 ||
    input.title.length > 160 ||
    (input.date !== null &&
      (typeof input.date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(input.date))) ||
    (input.time !== null &&
      (typeof input.time !== "string" ||
        !/^\d{2}:\d{2}$/.test(input.time))) ||
    typeof input.completed !== "boolean" ||
    typeof input.createdAt !== "number" ||
    !Number.isFinite(input.createdAt) ||
    !OFFSETS.has(offset as number | null) ||
    (notifyAt !== null &&
      (typeof notifyAt !== "number" || !Number.isFinite(notifyAt)))
  ) {
    return null;
  }
  return {
    id: input.id,
    title: input.title.trim(),
    date: input.date as string | null,
    time: input.time as string | null,
    completed: input.completed,
    createdAt: input.createdAt,
    notificationOffset: offset as number | null,
    notifyAt: notifyAt as number | null,
  };
}

export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || url.host;
  const protocol = request.headers.get("x-forwarded-proto") || url.protocol.slice(0, -1);
  return `${protocol}://${host}`;
}
