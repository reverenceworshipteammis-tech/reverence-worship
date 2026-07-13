import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";

const SESSION_COOKIE = "reverence_session";
const SESSION_IDLE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const authSecret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "");

export async function middleware(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE);
  if (!cookie?.value) {
    return NextResponse.next();
  }

  try {
    const { payload } = await jwtVerify(cookie.value, authSecret);
    const sessionPayload = payload as { userId: number; exp?: number };
    const now = Math.floor(Date.now() / 1000);
    const exp = typeof sessionPayload.exp === "number" ? sessionPayload.exp : 0;

    if (exp <= now) {
      const response = NextResponse.next();
      response.cookies.delete({ name: SESSION_COOKIE, path: "/" });
      return response;
    }

    const refreshedToken = await new SignJWT({ userId: sessionPayload.userId })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(now + SESSION_IDLE_MAX_AGE_SECONDS)
      .sign(authSecret);

    const response = NextResponse.next();
    response.cookies.set(SESSION_COOKIE, refreshedToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_IDLE_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  } catch {
    const response = NextResponse.next();
    response.cookies.delete({ name: SESSION_COOKIE, path: "/" });
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
