import {
  enforceRateLimit,
  getSubscription,
  isSameOriginBrowserRequest,
  removeSubscription,
} from "@/lib/server/push-store";
import {
  pushErrorStatus,
  sendPushNotification,
} from "@/lib/server/push-server";

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }
  if (!(await enforceRateLimit(request, "test", 5))) {
    return Response.json({ error: "Espera un minuto antes de repetir." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as {
    subscriptionId?: unknown;
  } | null;
  if (typeof body?.subscriptionId !== "string") {
    return Response.json({ error: "Suscripción no válida." }, { status: 400 });
  }
  const subscription = await getSubscription(body.subscriptionId);
  if (!subscription) {
    return Response.json({ error: "Activa otra vez las notificaciones." }, { status: 404 });
  }
  try {
    await sendPushNotification(subscription, {
      title: "Horadia",
      body: "Las notificaciones funcionan correctamente.",
      url: "/",
      tag: "horadia-test",
    });
    return Response.json({ ok: true });
  } catch (error) {
    const status = pushErrorStatus(error);
    if (status === 404 || status === 410) {
      await removeSubscription(body.subscriptionId);
      return Response.json(
        { error: "La suscripción ha caducado. Actívala de nuevo." },
        { status: 410 },
      );
    }
    console.error("[push:test] Error al enviar", { error: String(error) });
    return Response.json({ error: "No se pudo enviar la prueba." }, { status: 502 });
  }
}
