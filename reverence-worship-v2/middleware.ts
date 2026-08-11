import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "reverence_session";

const authSecret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "");

export async function middleware(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE);
  if (!cookie?.value) {
    return NextResponse.next();
  }

  try {
    const { payload } = await jwtVerify(cookie.value, authSecret);
    const sessionPayload = payload as { userId: number; sessionVersion?: number; exp?: number };
    const now = Math.floor(Date.now() / 1000);
    const exp = typeof sessionPayload.exp === "number" ? sessionPayload.exp : 0;

    if (exp <= now) {
      const response = NextResponse.next();
      response.cookies.delete({ name: SESSION_COOKIE, path: "/" });
      return response;
    }

    // Active clients refresh their configured idle session through /api/session/ping.
    // Avoid signing and rewriting the cookie for every page, image, and API request.
    return NextResponse.next();
  } catch {
    const response = NextResponse.next();
    response.cookies.delete({ name: SESSION_COOKIE, path: "/" });
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
