import { Receiver } from "@upstash/qstash";
import {
  getReminderSchedule,
  getSubscription,
  markReminderDelivered,
  removeSubscription,
} from "@/lib/server/push-store";
import {
  pushErrorStatus,
  sendPushNotification,
} from "@/lib/server/push-server";

export async function POST(request: Request) {
  const signature = request.headers.get("upstash-signature");
  if (!signature) return new Response("Forbidden", { status: 403 });
  const rawBody = await request.text();
  try {
    const receiver = new Receiver();
    await receiver.verify({
      signature,
      body: rawBody,
      upstashRegion: request.headers.get("upstash-region") ?? undefined,
    });
  } catch (error) {
    console.warn("[push:deliver] Firma QStash rechazada", { error: String(error) });
    return new Response("Forbidden", { status: 403 });
  }

  let body: {
    subscriptionId?: unknown;
    reminderId?: unknown;
    notifyAt?: unknown;
  };
  try {
    body = JSON.parse(rawBody) as typeof body;
  } catch {
    return Response.json({ error: "Mensaje no válido." }, { status: 400 });
  }
  if (
    typeof body.subscriptionId !== "string" ||
    typeof body.reminderId !== "string" ||
    typeof body.notifyAt !== "number"
  ) {
    return Response.json({ error: "Mensaje no válido." }, { status: 400 });
  }
  const schedule = await getReminderSchedule(
    body.subscriptionId,
    body.reminderId,
  );
  if (!schedule || schedule.notifyAt !== body.notifyAt) {
    return Response.json({ ok: true, stale: true });
  }
  const subscription = await getSubscription(body.subscriptionId);
  if (!subscription) {
    await markReminderDelivered(body.subscriptionId, body.reminderId);
    return Response.json({ ok: true, missingSubscription: true });
  }

  try {
    await sendPushNotification(subscription, {
      title: "Horadia",
      body: schedule.title,
      url: `/?reminder=${encodeURIComponent(schedule.id)}`,
      tag: `reminder-${schedule.id}`,
    });
    await markReminderDelivered(body.subscriptionId, body.reminderId);
    return Response.json({ ok: true });
  } catch (error) {
    const status = pushErrorStatus(error);
    if (status === 404 || status === 410) {
      await removeSubscription(body.subscriptionId);
      return Response.json({ ok: true, expired: true });
    }
    console.error("[push:deliver] Error temporal", { error: String(error) });
    return Response.json({ error: "Error temporal de Web Push." }, { status: 503 });
  }
}
