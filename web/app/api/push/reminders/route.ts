import {
  enforceRateLimit,
  getSubscription,
  isSameOriginBrowserRequest,
  replaceMissingReminderSchedules,
  upsertReminderSchedule,
} from "@/lib/server/push-store";
import {
  parseReminderSchedule,
  requestOrigin,
} from "@/lib/server/push-validation";

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }
  if (!(await enforceRateLimit(request, "reminders", 30))) {
    return Response.json({ error: "Demasiadas sincronizaciones." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (
    !body ||
    typeof body.subscriptionId !== "string" ||
    !/^[A-Za-z0-9_-]{20,40}$/.test(body.subscriptionId) ||
    !Array.isArray(body.reminders) ||
    body.reminders.length > 100
  ) {
    return Response.json({ error: "Petición no válida." }, { status: 400 });
  }
  const subscriptionId = body.subscriptionId;
  if (!(await getSubscription(subscriptionId))) {
    return Response.json({ error: "Suscripción no encontrada." }, { status: 404 });
  }
  const reminders = body.reminders.map(parseReminderSchedule);
  if (reminders.some((reminder) => reminder === null)) {
    return Response.json({ error: "Recordatorio no válido." }, { status: 400 });
  }

  const origin = requestOrigin(request);
  const results = [];
  for (const reminder of reminders) {
    if (!reminder) continue;
    results.push({
      id: reminder.id,
      status: await upsertReminderSchedule(subscriptionId, reminder, origin),
    });
  }
  if (body.replace === true) {
    await replaceMissingReminderSchedules(
      subscriptionId,
      new Set(reminders.flatMap((reminder) => (reminder ? [reminder.id] : []))),
    );
  }
  return Response.json({ ok: true, results });
}
