import "server-only";

import webpush from "web-push";
import type { StoredPushSubscription } from "./push-store";

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

export async function sendPushNotification(
  subscription: StoredPushSubscription,
  payload: PushPayload,
): Promise<void> {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("Las claves VAPID no están configuradas.");
  }
  await webpush.sendNotification(subscription, JSON.stringify(payload), {
    TTL: 24 * 60 * 60,
    urgency: "normal",
    topic: payload.tag.slice(0, 32),
    vapidDetails: { subject, publicKey, privateKey },
  });
}

export function pushErrorStatus(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }
  return null;
}
