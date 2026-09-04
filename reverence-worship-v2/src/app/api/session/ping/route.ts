import { NextResponse } from "next/server";
import { createSession, getCurrentUser } from "@/lib/auth";
import { isTransientDatabaseError } from "@/lib/database-retry";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    await createSession(user.id, { sessionVersion: user.sessionVersion });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (!isTransientDatabaseError(error)) throw error;
    console.error("Session refresh deferred because the database connection is unavailable.", error);
    return NextResponse.json({ ok: false, retry: true }, { status: 503 });
  }
}
