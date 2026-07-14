import { NextResponse } from "next/server";
import { createSession, getCurrentUser } from "@/lib/auth";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
