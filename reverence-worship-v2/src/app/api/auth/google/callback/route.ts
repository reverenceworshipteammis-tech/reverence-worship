import { NextRequest, NextResponse } from "next/server";
import { createSession, needsGoogleProfileCompletion } from "@/lib/auth";
import { exchangeGoogleCode, GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google-oauth";
import { notifyUsers, userIdsWithPermission } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { isRegistrationEnabled } from "@/lib/system-settings";

function loginRedirect(request: NextRequest, error: string) {
  const url = new URL("/login", request.nextUrl.origin);
  url.searchParams.set("error", error);
  const response = NextResponse.redirect(url);
  response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
  return response;
}

async function createGoogleUser(profile: Awaited<ReturnType<typeof exchangeGoogleCode>>) {
  const [registrationEnabled, userCount] = await Promise.all([
    isRegistrationEnabled(),
    prisma.user.count(),
  ]);

  if (!registrationEnabled && userCount > 0) {
    return { user: null, message: "Public registration is currently disabled." };
  }

  const firstUser = userCount === 0;
  const role = await prisma.role.findUniqueOrThrow({ where: { name: firstUser ? "super-admin" : "member" } });
  const user = await prisma.user.create({
    data: {
      name: profile.name,
      email: profile.email,
      googleId: profile.sub,
      avatarUrl: profile.picture,
      emailVerifiedAt: new Date(),
      membershipType: "permanent",
      status: firstUser ? "active" : "pending",
      roles: { create: { roleId: role.id } },
    },
  });

  await notifyUsers({
    userIds: [user.id],
    type: "account",
    title: "Google account connected",
    message: firstUser
      ? "Your account has been created and activated with Google sign-in."
      : "Your Google registration was received and is awaiting administrator approval.",
    link: "/admin/dashboard",
    sourceType: "user",
    sourceId: user.id,
    dedupeKey: `google-registration:${user.id}:submitted`,
  });

  if (!firstUser) {
    const approverIds = await userIdsWithPermission("users", "change-status");
    await notifyUsers({
      userIds: approverIds,
      type: "account",
      title: "New Google account awaiting approval",
      message: `${user.name} signed in with Google and is awaiting approval.`,
      link: "/admin/users",
      sourceType: "user",
      sourceId: user.id,
      dedupeKey: `google-registration:${user.id}:approval`,
    });
  }

  return {
    user,
    message: firstUser ? null : "Google registration received. An admin must activate your account before login.",
  };
}

export async function GET(request: NextRequest) {
  const receivedState = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const code = request.nextUrl.searchParams.get("code");
  const googleError = request.nextUrl.searchParams.get("error");

  if (googleError) {
    return loginRedirect(request, "Google sign-in was cancelled.");
  }

  if (!code || !receivedState || !expectedState || receivedState !== expectedState) {
    return loginRedirect(request, "Google sign-in could not be verified. Please try again.");
  }

  try {
    const profile = await exchangeGoogleCode(request.nextUrl.origin, code);
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: profile.sub }, { email: profile.email }] },
      include: { roles: { include: { role: true } } },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId ?? profile.sub,
          avatarUrl: profile.picture,
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          name: user.name || profile.name,
          mustChangePassword: false,
        },
        include: { roles: { include: { role: true } } },
      });
    } else {
      const result = await createGoogleUser(profile);
      if (!result.user || result.message) return loginRedirect(request, result.message ?? "Google sign-in failed.");
      user = await prisma.user.findUnique({
        where: { id: result.user.id },
        include: { roles: { include: { role: true } } },
      });
    }

    if (!user) return loginRedirect(request, "Google sign-in failed.");
    if (user.status !== "active") return loginRedirect(request, "Your account is not active yet.");

    await createSession(user.id);
    const response = NextResponse.redirect(new URL(needsGoogleProfileCompletion(user) ? "/complete-profile" : "/admin/dashboard", request.nextUrl.origin));
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    return response;
  } catch (error) {
    return loginRedirect(request, error instanceof Error ? error.message : "Google sign-in failed.");
  }
}
