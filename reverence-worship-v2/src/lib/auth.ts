import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { normalizeSessionLifetimeMinutes } from "@/lib/session-policy";
import { getSystemSetting, settingToNumber } from "@/lib/system-settings";

export const SESSION_COOKIE = "reverence_session";

type SessionPayload = {
  userId: number;
  sessionVersion?: number;
};

export type PermissionKey =
  | "*"
  | `${string}.${string}`;

function authSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is required.");
  }

  return secret;
}

export async function createSession(userId: number) {
  const [sessionLifetimeSetting, user] = await Promise.all([
    getSystemSetting("session_lifetime"),
    prisma.user.findUnique({ where: { id: userId }, select: { status: true, sessionVersion: true } }),
  ]);
  if (!user || user.status !== "active") {
    throw new Error("Only an active account can start a session.");
  }
  const sessionLifetimeMinutes = normalizeSessionLifetimeMinutes(
    settingToNumber(sessionLifetimeSetting, 10),
  );
  const maxAgeSeconds = sessionLifetimeMinutes * 60;
  const token = jwt.sign({ userId, sessionVersion: user.sessionVersion } satisfies SessionPayload, authSecret(), {
    expiresIn: maxAgeSeconds,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSeconds,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export function verifySessionToken(token: string) {
  try {
    return jwt.verify(token, authSecret()) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const payload = verifySessionToken(token);
  if (!payload || (payload.sessionVersion !== undefined && !Number.isInteger(payload.sessionVersion))) {
    return null;
  }
  const sessionVersion = payload.sessionVersion ?? 0;

  return prisma.user.findFirst({
    where: {
      id: payload.userId,
      status: "active",
      sessionVersion,
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export function needsGoogleProfileCompletion(user: {
  googleId?: string | null;
  phone?: string | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
  maritalStatus?: string | null;
  province?: string | null;
  district?: string | null;
  sector?: string | null;
  cell?: string | null;
  village?: string | null;
}) {
  if (!user.googleId) return false;

  return [
    user.phone,
    user.dateOfBirth,
    user.gender,
    user.maritalStatus,
    user.province,
    user.district,
    user.sector,
    user.cell,
    user.village,
  ].some((value) => !value);
}

export async function requireAdminUser() {
  const user = await requireUser();
  const roleNames = user.roles.map((userRole) => userRole.role.name);

  const workspaceRoles = new Set([
    "super-admin",
    "admin",
    "music-dpt",
    "social-dpt",
    "discipline-dpt",
    "intercession-dpt",
    "finance-dpt",
  ]);

  if (!roleNames.some((roleName) => workspaceRoles.has(roleName))) {
    redirect("/");
  }

  return user;
}

export async function getUserPermissionSet(user: Awaited<ReturnType<typeof requireUser>>) {
  const roleNames = user.roles.map((userRole) => userRole.role.name);

  if (roleNames.includes("super-admin")) {
    return new Set<PermissionKey>(["*"]);
  }

  const roleIds = user.roles.map((userRole) => userRole.roleId);
  if (roleIds.length === 0) return new Set<PermissionKey>();

  const permissions = await prisma.rolePageFeature.findMany({
    where: { roleId: { in: roleIds } },
    include: {
      page: { select: { name: true } },
      feature: { select: { name: true } },
    },
  });

  const permissionSet = new Set<PermissionKey>(
    permissions.map((permission) => `${permission.page.name}.${permission.feature.name}` as PermissionKey),
  );

  const [parentMembership, parentFamily] = await Promise.all([
    prisma.familyMember.findFirst({
      where: { userId: user.id, role: { equals: "parent", mode: "insensitive" } },
      select: { id: true },
    }),
    prisma.family.findFirst({ where: { parentId: user.id }, select: { id: true } }),
  ]);
  if (parentMembership || parentFamily) permissionSet.add("parent.view");

  return permissionSet;
}

export function permissionSetHas(permissions: Set<PermissionKey>, page: string, feature: string) {
  return permissions.has("*") || permissions.has(`${page}.${feature}` as PermissionKey);
}

export function permissionSetHasPage(permissions: Set<PermissionKey>, page: string) {
  return permissions.has("*") || Array.from(permissions).some((permission) => permission.startsWith(`${page}.`));
}

export async function requirePageAccess(page: string, redirectTo = "/admin/dashboard") {
  const user = await requireUser();
  const permissions = await getUserPermissionSet(user);

  if (!permissionSetHasPage(permissions, page)) {
    redirect(redirectTo);
  }

  return user;
}

export async function requirePermission(page: string, feature: string, redirectTo = "/admin/dashboard") {
  const user = await requireUser();
  const permissions = await getUserPermissionSet(user);

  if (!permissionSetHas(permissions, page, feature)) {
    redirect(redirectTo);
  }

  return user;
}

export async function requireAnyPermission(page: string, features: string[], redirectTo = "/admin/dashboard") {
  const user = await requireUser();
  const permissions = await getUserPermissionSet(user);

  if (!features.some((feature) => permissionSetHas(permissions, page, feature))) {
    redirect(redirectTo);
  }

  return user;
}
