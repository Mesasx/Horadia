import { prepareUpcomingReminders } from "@/lib/server/push-store";
import { requestOrigin } from "@/lib/server/push-validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await prepareUpcomingReminders(requestOrigin(request));
  return Response.json({ ok: true, ...result });
}
