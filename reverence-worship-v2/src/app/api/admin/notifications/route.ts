import { getCurrentUser } from "@/lib/auth";
import { getAdminNotifications } from "@/app/admin/notifications/actions";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  if (!await getCurrentUser()) return Response.json({ ok: false }, { status: 401, headers });
  const result = await getAdminNotifications();
  return Response.json(result, { status: result.ok ? 200 : 503, headers });
}
