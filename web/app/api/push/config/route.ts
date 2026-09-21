import { requireApiAccess } from "@/lib/server/require-access";
import { pushBackendConfigured } from "@/lib/server/push-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireApiAccess();
  if (denied) return denied;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey || !pushBackendConfigured()) {
    return Response.json(
      { error: "Las notificaciones todavía no están configuradas." },
      { status: 503 },
    );
  }
  return Response.json(
    { publicKey },
    { headers: { "Cache-Control": "no-store" } },
  );
}
