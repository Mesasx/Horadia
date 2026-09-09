import "server-only";

import { createHash } from "node:crypto";
import { Client as QStashClient } from "@upstash/qstash";
import { Redis } from "@upstash/redis";

const PREFIX = "horadia:push";
const PENDING_KEY = `${PREFIX}:pending`;
const PREPARE_HORIZON_MS = 6 * 24 * 60 * 60 * 1_000;

export interface StoredPushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
}

export interface ReminderScheduleInput {
  id: string;
  title: string;
  date: string | null;
  time: string | null;
  completed: boolean;
  createdAt: number;
  notificationOffset: number | null;
  notifyAt: number | null;
}

export interface StoredReminderSchedule extends ReminderScheduleInput {
  subscriptionId: string;
  member: string;
  messageId: string | null;
}

let redisClient: Redis | null = null;
let qstashClient: QStashClient | null = null;

function redis(): Redis {
  if (redisClient) return redisClient;
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Redis no está configurado.");
  redisClient = new Redis({ url, token });
  return redisClient;
}

function qstash(): QStashClient {
  if (qstashClient) return qstashClient;
  const token = process.env.QSTASH_TOKEN;
  if (!token) throw new Error("QStash no está configurado.");
  qstashClient = new QStashClient({
    token,
    baseUrl: process.env.QSTASH_URL,
    enableTelemetry: false,
  });
  return qstashClient;
}

function subscriptionKey(id: string): string {
  return `${PREFIX}:subscription:${id}`;
}

function reminderSetKey(subscriptionId: string): string {
  return `${PREFIX}:reminders:${subscriptionId}`;
}

function reminderKey(member: string): string {
  return `${PREFIX}:reminder:${member}`;
}

function reminderMember(subscriptionId: string, reminderId: string): string {
  return `${subscriptionId}:${reminderId}`;
}

export function pushBackendConfigured(): boolean {
  return Boolean(
    (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
      (process.env.KV_REST_API_TOKEN ||
        process.env.UPSTASH_REDIS_REST_TOKEN) &&
      process.env.QSTASH_TOKEN &&
      process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

export async function enforceRateLimit(
  request: Request,
  action: string,
  limit: number,
): Promise<boolean> {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  const ip = forwarded?.trim() || request.headers.get("x-real-ip") || "local";
  const bucket = Math.floor(Date.now() / 60_000);
  const key = `${PREFIX}:rate:${action}:${ip}:${bucket}`;
  const count = await redis().incr(key);
  if (count === 1) await redis().expire(key, 120);
  return count <= limit;
}

export function isSameOriginBrowserRequest(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function saveSubscription(
  subscription: StoredPushSubscription,
): Promise<string> {
  const id = createHash("sha256")
    .update(subscription.endpoint)
    .digest("base64url")
    .slice(0, 32);
  await redis().set(subscriptionKey(id), subscription);
  return id;
}

export async function getSubscription(
  id: string,
): Promise<StoredPushSubscription | null> {
  return redis().get<StoredPushSubscription>(subscriptionKey(id));
}

async function cancelQStashMessage(messageId: string | null): Promise<void> {
  if (!messageId) return;
  try {
    await qstash().messages.cancel(messageId);
  } catch (error) {
    console.warn("[push] No se pudo cancelar el mensaje anterior", {
      messageId,
      error: String(error),
    });
  }
}

async function deleteReminderSchedule(
  subscriptionId: string,
  reminderId: string,
): Promise<void> {
  const member = reminderMember(subscriptionId, reminderId);
  const existing = await redis().get<StoredReminderSchedule>(reminderKey(member));
  await cancelQStashMessage(existing?.messageId ?? null);
  await Promise.all([
    redis().del(reminderKey(member)),
    redis().zrem(PENDING_KEY, member),
    redis().srem(reminderSetKey(subscriptionId), reminderId),
  ]);
}

async function queueReminder(
  schedule: StoredReminderSchedule,
  destinationOrigin: string,
): Promise<StoredReminderSchedule> {
  const now = Date.now();
  if (schedule.notifyAt === null || schedule.notifyAt <= now) return schedule;
  if (schedule.notifyAt > now + PREPARE_HORIZON_MS) return schedule;

  const response = await qstash().publishJSON({
    url: `${destinationOrigin}/api/push/deliver`,
    body: {
      subscriptionId: schedule.subscriptionId,
      reminderId: schedule.id,
      notifyAt: schedule.notifyAt,
    },
    notBefore: Math.floor(schedule.notifyAt / 1_000),
    retries: 3,
    label: "horadia-reminder",
  });
  const queued = { ...schedule, messageId: response.messageId };
  await redis().set(reminderKey(schedule.member), queued);
  return queued;
}

export async function upsertReminderSchedule(
  subscriptionId: string,
  input: ReminderScheduleInput,
  destinationOrigin: string,
): Promise<"cancelled" | "pending" | "scheduled"> {
  const member = reminderMember(subscriptionId, input.id);
  const existing = await redis().get<StoredReminderSchedule>(reminderKey(member));
  if (
    input.completed ||
    input.notificationOffset === null ||
    input.notifyAt === null ||
    input.notifyAt <= Date.now()
  ) {
    await deleteReminderSchedule(subscriptionId, input.id);
    return "cancelled";
  }

  if (
    existing?.notifyAt === input.notifyAt &&
    existing.title === input.title &&
    existing.messageId
  ) {
    return "scheduled";
  }
  await cancelQStashMessage(existing?.messageId ?? null);
  const schedule: StoredReminderSchedule = {
    ...input,
    subscriptionId,
    member,
    messageId: null,
  };
  await Promise.all([
    redis().set(reminderKey(member), schedule),
    redis().zadd(PENDING_KEY, { score: input.notifyAt, member }),
    redis().sadd(reminderSetKey(subscriptionId), input.id),
  ]);
  const queued = await queueReminder(schedule, destinationOrigin);
  return queued.messageId ? "scheduled" : "pending";
}

export async function replaceMissingReminderSchedules(
  subscriptionId: string,
  currentIds: Set<string>,
): Promise<void> {
  const storedIds = await redis().smembers<string[]>(reminderSetKey(subscriptionId));
  await Promise.all(
    storedIds
      .filter((id) => !currentIds.has(id))
      .map((id) => deleteReminderSchedule(subscriptionId, id)),
  );
}

export async function prepareUpcomingReminders(
  destinationOrigin: string,
): Promise<{ checked: number; scheduled: number }> {
  const members = await redis().zrange<string[]>(
    PENDING_KEY,
    0,
    Date.now() + PREPARE_HORIZON_MS,
    { byScore: true, offset: 0, count: 250 },
  );
  let scheduled = 0;
  for (const member of members) {
    const record = await redis().get<StoredReminderSchedule>(reminderKey(member));
    if (!record || record.messageId || record.notifyAt === null) continue;
    const queued = await queueReminder(record, destinationOrigin);
    if (queued.messageId) scheduled += 1;
  }
  return { checked: members.length, scheduled };
}

export async function getReminderSchedule(
  subscriptionId: string,
  reminderId: string,
): Promise<StoredReminderSchedule | null> {
  return redis().get<StoredReminderSchedule>(
    reminderKey(reminderMember(subscriptionId, reminderId)),
  );
}

export async function markReminderDelivered(
  subscriptionId: string,
  reminderId: string,
): Promise<void> {
  const member = reminderMember(subscriptionId, reminderId);
  await Promise.all([
    redis().del(reminderKey(member)),
    redis().zrem(PENDING_KEY, member),
    redis().srem(reminderSetKey(subscriptionId), reminderId),
  ]);
}

export async function removeSubscription(subscriptionId: string): Promise<void> {
  const reminderIds = await redis().smembers<string[]>(
    reminderSetKey(subscriptionId),
  );
  for (const reminderId of reminderIds) {
    await deleteReminderSchedule(subscriptionId, reminderId);
  }
  await Promise.all([
    redis().del(subscriptionKey(subscriptionId)),
    redis().del(reminderSetKey(subscriptionId)),
  ]);
}
