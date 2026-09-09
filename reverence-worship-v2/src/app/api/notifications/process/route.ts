import { NextRequest, NextResponse } from "next/server";
import { runScheduledNotificationJobs } from "@/lib/notification-jobs";
import { notifySuperAdmins, sendCriticalSystemEmail } from "@/lib/notifications";
import { kigaliDateKey } from "@/lib/calendar-date";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

async function handler(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await runScheduledNotificationJobs()) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      await sendCriticalSystemEmail("Critical scheduled job or database failure", message);
    } catch {
      // The platform request remains failed so external monitoring can also alert.
    }
    try {
      await notifySuperAdmins({ type: "system", title: "Scheduled notification job failed", message, link: "/admin/settings", dedupeKey: `scheduled-job:${kigaliDateKey()}`, sendEmail: false });
    } catch {
      // The database may itself be unavailable; the platform still records this failed request.
    }
    return NextResponse.json({ ok: false, error: "Notification processing failed." }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
