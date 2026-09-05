import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "reverence_session";
const RETURN_PATH_HEADER = "x-reverence-return-path";

const authSecret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "");

function requestedPath(request: NextRequest) {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

function loginRedirect(request: NextRequest, clearSession = false) {
  const url = new URL("/login", request.url);
  url.searchParams.set("next", requestedPath(request));
  const response = NextResponse.redirect(url);
  if (clearSession) response.cookies.delete({ name: SESSION_COOKIE, path: "/" });
  return response;
}

function continueRequest(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(RETURN_PATH_HEADER, requestedPath(request));
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function proxy(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE);
  const protectedRoute = request.nextUrl.pathname.startsWith("/admin/") || request.nextUrl.pathname === "/admin";

  if (!cookie?.value) {
    return protectedRoute ? loginRedirect(request) : continueRequest(request);
  }

  try {
    const { payload } = await jwtVerify(cookie.value, authSecret);
    const sessionPayload = payload as { userId: number; sessionVersion?: number; exp?: number };
    const now = Math.floor(Date.now() / 1000);
    const exp = typeof sessionPayload.exp === "number" ? sessionPayload.exp : 0;

    if (exp <= now) {
      return protectedRoute ? loginRedirect(request, true) : clearInvalidSession(request);
    }

    // Active clients refresh their configured idle session through /api/session/ping.
    // Avoid signing and rewriting the cookie for every page, image, and API request.
    return continueRequest(request);
  } catch {
    return protectedRoute ? loginRedirect(request, true) : clearInvalidSession(request);
  }
}

function clearInvalidSession(request: NextRequest) {
  const response = continueRequest(request);
  response.cookies.delete({ name: SESSION_COOKIE, path: "/" });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
