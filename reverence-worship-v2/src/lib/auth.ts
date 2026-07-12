import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "reverence_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  userId: number;
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
  const token = jwt.sign({ userId } satisfies SessionPayload, authSecret(), {
    expiresIn: SESSION_MAX_AGE_SECONDS,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, authSecret()) as SessionPayload;

    return prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
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

  return new Set<PermissionKey>(
    permissions.map((permission) => `${permission.page.name}.${permission.feature.name}` as PermissionKey),
  );
}

export function permissionSetHas(permissions: Set<PermissionKey>, page: string, feature: string) {
  return permissions.has("*") || permissions.has(`${page}.${feature}` as PermissionKey);
}

export async function requirePermission(page: string, feature: string, redirectTo = "/admin/dashboard") {
  const user = await requireUser();
  const permissions = await getUserPermissionSet(user);

  if (!permissionSetHas(permissions, page, feature)) {
    redirect(redirectTo);
  }

  return user;
}
