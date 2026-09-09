import {
  enforceRateLimit,
  isSameOriginBrowserRequest,
  pushBackendConfigured,
  saveSubscription,
} from "@/lib/server/push-store";
import { parsePushSubscription } from "@/lib/server/push-validation";

export async function POST(request: Request) {
  if (!pushBackendConfigured()) {
    return Response.json({ error: "Web Push no está configurado." }, { status: 503 });
  }
  if (!isSameOriginBrowserRequest(request)) {
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }
  if (!(await enforceRateLimit(request, "subscribe", 12))) {
    return Response.json({ error: "Demasiados intentos." }, { status: 429 });
  }
  const subscription = parsePushSubscription(await request.json().catch(() => null));
  if (!subscription) {
    return Response.json({ error: "Suscripción no válida." }, { status: 400 });
  }
  const subscriptionId = await saveSubscription(subscription);
  return Response.json({ subscriptionId });
}
