import { NextRequest, NextResponse } from "next/server";
import { createGoogleOAuthState, GOOGLE_OAUTH_RETURN_COOKIE, GOOGLE_OAUTH_STATE_COOKIE, googleAuthorizationUrl } from "@/lib/google-oauth";
import { safeAuthReturnPath } from "@/lib/auth-return-path";

function loginUrl(request: NextRequest, error: string, returnTo: string) {
  const url = new URL("/login", request.nextUrl.origin);
  url.searchParams.set("error", error);
  url.searchParams.set("next", returnTo);
  return url;
}

export async function GET(request: NextRequest) {
  const returnTo = safeAuthReturnPath(request.nextUrl.searchParams.get("next"));
  try {
    const state = createGoogleOAuthState();
    const response = NextResponse.redirect(googleAuthorizationUrl(request.nextUrl.origin, state));

    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60,
      path: "/",
    });
    response.cookies.set(GOOGLE_OAUTH_RETURN_COOKIE, returnTo, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google sign-in is not available.";
    return NextResponse.redirect(loginUrl(request, message, returnTo));
  }
}
