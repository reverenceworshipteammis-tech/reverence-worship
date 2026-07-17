"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyEmailAddress, notifyUsers } from "@/lib/notifications";

const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().optional(),
  dateOfBirth: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  sector: z.string().optional(),
  village: z.string().optional(),
  gender: z.enum(["", "male", "female"]).optional(),
  maritalStatus: z.string().optional(),
  membershipType: z.enum(["", "permanent", "temporary", "visitor"]).optional(),
  occupation: z.string().optional(),
  skills: z.string().optional(),
  password: z.string().min(6),
  passwordConfirmation: z.string().min(6),
  status: z.enum(["active", "pending", "inactive"]).default("active"),
}).refine((data) => data.password === data.passwordConfirmation, {
  message: "Passwords do not match.",
  path: ["passwordConfirmation"],
});

const updateUserSchema = z.object({
  userId: z.coerce.number(),
  name: z.string().trim().min(2),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().optional(),
  dateOfBirth: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  sector: z.string().optional(),
  village: z.string().optional(),
  gender: z.enum(["", "male", "female"]).optional(),
  maritalStatus: z.string().optional(),
  membershipType: z.enum(["", "permanent", "temporary", "visitor"]).optional(),
  occupation: z.string().optional(),
  skills: z.string().optional(),
  status: z.enum(["active", "pending", "inactive"]),
  password: z.string().optional(),
  passwordConfirmation: z.string().optional(),
}).superRefine((data, context) => {
  const password = data.password?.trim() ?? "";
  const confirmation = data.passwordConfirmation?.trim() ?? "";

  if (!password && !confirmation) return;

  if (password.length < 6) {
    context.addIssue({
      code: "custom",
      message: "Password must be at least 6 characters.",
      path: ["password"],
    });
  }

  if (password !== confirmation) {
    context.addIssue({
      code: "custom",
      message: "Passwords do not match.",
      path: ["passwordConfirmation"],
    });
  }
});

export type UserActionState = {
  ok?: boolean;
  message?: string;
};

async function roleIdsWithMemberBase(roleIds: number[]) {
  const uniqueRoleIds = [...new Set(roleIds.filter(Number.isFinite))];
  const assignableRoleIds =
    uniqueRoleIds.length > 0
      ? (
          await prisma.role.findMany({
            where: { id: { in: uniqueRoleIds }, name: { not: "super-admin" } },
            select: { id: true },
          })
        ).map((role) => role.id)
      : [];

  const normalizedRoleIds = [...new Set(assignableRoleIds)];

  const memberRole = await prisma.role.findUnique({
    where: { name: "member" },
    select: { id: true },
  });

  if (memberRole && !normalizedRoleIds.includes(memberRole.id)) {
    normalizedRoleIds.push(memberRole.id);
  }

  return normalizedRoleIds;
}

async function isSuperAdminUser(userId: number) {
  const superAdminRole = await prisma.userRole.findFirst({
    where: { userId, role: { name: "super-admin" } },
    select: { userId: true },
  });

  return Boolean(superAdminRole);
}

function accountStatusNotification(action: "approve" | "activate" | "deactivate", previousStatus?: string) {
  if (action === "deactivate") {
    return {
      title: "Account deactivated",
      message: "Your account has been deactivated.",
      emailSubject: "Your Reverence Worship account was deactivated",
      emailText: "Your Reverence Worship account has been deactivated. Contact an administrator if you need more information.",
    };
  }

  const approved = action === "approve" || previousStatus === "pending";
  return {
    title: approved ? "Account approved" : "Account reactivated",
    message: approved ? "Your account has been approved. You can now sign in." : "Your account is active again. You can sign in.",
    emailSubject: approved ? "Your Reverence Worship account has been approved" : "Your Reverence Worship account is active again",
    emailText: approved
      ? "Good news. Your Reverence Worship account has been approved. You can now sign in and access your dashboard."
      : "Your Reverence Worship account is active again. You can now sign in and access your dashboard.",
  };
}

export async function createUserAction(
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const admin = await requirePermission("users", "create", "/admin/users");
  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid user details." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existingUser) {
    return { ok: false, message: "A user with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const roleIds = await roleIdsWithMemberBase(
    formData
      .getAll("roles")
      .map((roleId) => Number(roleId))
      .filter(Number.isFinite),
  );

  const createdUser = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
      province: parsed.data.province || null,
      district: parsed.data.district || null,
      sector: parsed.data.sector || null,
      village: parsed.data.village || null,
      gender: parsed.data.gender || null,
      maritalStatus: parsed.data.maritalStatus || null,
      membershipType: parsed.data.membershipType || null,
      occupation: parsed.data.occupation || null,
      skills: parsed.data.skills || null,
      passwordHash,
      status: parsed.data.status,
      emailVerifiedAt: parsed.data.status === "active" ? new Date() : null,
      createdById: admin.id,
      roles: roleIds.length > 0
        ? {
            create: roleIds.map((roleId) => ({ roleId })),
          }
        : undefined,
    },
  });

  await notifyUsers({
    userIds: [createdUser.id],
    type: "account",
    title: "Account created",
    message: `Your account was created with ${createdUser.status} status.`,
    link: "/admin/dashboard",
    sourceType: "user",
    sourceId: createdUser.id,
    dedupeKey: `account:${createdUser.id}:created`,
  });
  await prisma.activityLog.create({ data: { userId: admin.id, action: "users.created", module: "users", metadata: { affectedUserId: createdUser.id, status: createdUser.status } } });

  revalidatePath("/admin/users");
  revalidatePath("/admin/dashboard");

  return { ok: true, message: "User created successfully." };
}

export async function runUserTableAction(formData: FormData) {
  const userId = Number(formData.get("userId"));
  const action = String(formData.get("action") || "");
  const admin = await requirePermission("users", action === "delete" || action === "reject" ? "delete" : "change-status", "/admin/users");

  if (!Number.isFinite(userId)) {
    return { ok: false, message: "Invalid user." };
  }

  const affectedUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, status: true } });
  if (!affectedUser) return { ok: false, message: "User not found." };

  if (action === "approve" || action === "activate") {
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: "active",
        emailVerifiedAt: new Date(),
      },
    });
  }

  if (action === "deactivate") {
    await prisma.user.update({
      where: { id: userId },
      data: { status: "inactive" },
    });
  }

  if (action === "reject" || action === "delete") {
    if (action === "reject") {
      await notifyEmailAddress(affectedUser.email, "Account registration rejected", "Your account registration was reviewed and rejected. Contact an administrator if you need more information.");
    }
    await prisma.user.delete({
      where: { id: userId },
    });
  }


  if (["approve", "activate", "deactivate"].includes(action)) {
    const notification = accountStatusNotification(action as "approve" | "activate" | "deactivate", affectedUser.status);
    await notifyUsers({
      userIds: [userId],
      type: "account",
      title: notification.title,
      message: notification.message,
      link: "/admin/dashboard",
      sourceType: "user",
      sourceId: userId,
      dedupeKey: `account:${userId}:${action}:${Date.now()}`,
      emailSubject: notification.emailSubject,
      emailText: notification.emailText,
      sendEmail: true,
    });
  }
  await prisma.activityLog.create({ data: { userId: (action === "delete" || action === "reject") && admin.id === userId ? null : admin.id, action: `users.${action}`, module: "users", metadata: { affectedUserId: userId } } });

  revalidatePath("/admin/users");
  revalidatePath("/admin/dashboard");

  return { ok: true, message: "User updated successfully." };
}

export async function updateUserRoleAction(formData: FormData) {
  const admin = await requirePermission("users", "assign-roles", "/admin/users");

  const userId = Number(formData.get("userId"));
  const roleId = Number(formData.get("roleId"));

  if (!Number.isFinite(userId) || !Number.isFinite(roleId)) {
    return { ok: false, message: "Invalid role update." };
  }

  if (await isSuperAdminUser(userId)) {
    return { ok: false, message: "Super Admin is internal and cannot be changed from roles." };
  }

  const roleIds = await roleIdsWithMemberBase([roleId]);

  await prisma.userRole.deleteMany({ where: { userId } });
  await prisma.userRole.createMany({
    data: roleIds.map((roleId) => ({ userId, roleId })),
    skipDuplicates: true,
  });

  await notifyUsers({
    userIds: [userId], type: "account", title: "Role changed",
    message: "Your account role and access permissions were updated.", link: "/admin/dashboard",
    sourceType: "user", sourceId: userId, dedupeKey: `account:${userId}:role:${Date.now()}`,
  });
  await prisma.activityLog.create({ data: { userId: admin.id, action: "users.role-updated", module: "users", metadata: { affectedUserId: userId, roleIds } } });

  revalidatePath("/admin/users");

  return { ok: true, message: "Role updated successfully." };
}

export async function updateUserAction(
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const admin = await requirePermission("users", "edit", "/admin/users");

  const parsed = updateUserSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid user details." };
  }

  const currentUser = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { email: true, status: true } });
  if (!currentUser) return { ok: false, message: "User not found." };

  const existingUser = await prisma.user.findFirst({
    where: {
      email: parsed.data.email,
      id: { not: parsed.data.userId },
    },
  });

  if (existingUser) {
    return { ok: false, message: "Another user already uses this email." };
  }

  const password = parsed.data.password?.trim();
  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
      province: parsed.data.province || null,
      district: parsed.data.district || null,
      sector: parsed.data.sector || null,
      village: parsed.data.village || null,
      gender: parsed.data.gender || null,
      maritalStatus: parsed.data.maritalStatus || null,
      membershipType: parsed.data.membershipType || null,
      occupation: parsed.data.occupation || null,
      skills: parsed.data.skills || null,
      status: parsed.data.status,
      emailVerifiedAt: parsed.data.status === "active" ? new Date() : null,
      ...(passwordHash ? { passwordHash } : {}),
    },
  });

  if (currentUser.email !== parsed.data.email) {
    await Promise.all([
      notifyEmailAddress(currentUser.email, "Email address changed", `The email address on your Reverence Worship account was changed to ${parsed.data.email}. Contact an administrator immediately if you did not request this.`),
      notifyUsers({ userIds: [parsed.data.userId], type: "security", title: "Email address changed", message: `Your account email was changed from ${currentUser.email}.`, link: "/admin/profile", sourceType: "user", sourceId: parsed.data.userId, dedupeKey: `account:${parsed.data.userId}:email:${Date.now()}` }),
    ]);
  }
  if (passwordHash) {
    await notifyUsers({ userIds: [parsed.data.userId], type: "security", title: "Password changed", message: "Your account password was changed successfully. Contact an administrator if you did not request this.", link: "/admin/profile", sourceType: "user", sourceId: parsed.data.userId, dedupeKey: `account:${parsed.data.userId}:password:${Date.now()}` });
  }
  if (currentUser.status !== parsed.data.status) {
    const action = parsed.data.status === "active" ? "activate" : "deactivate";
    const notification = accountStatusNotification(action, currentUser.status);
    await notifyUsers({
      userIds: [parsed.data.userId],
      type: "account",
      title: notification.title,
      message: notification.message,
      link: "/admin/dashboard",
      sourceType: "user",
      sourceId: parsed.data.userId,
      dedupeKey: `account:${parsed.data.userId}:status:${Date.now()}`,
      emailSubject: notification.emailSubject,
      emailText: notification.emailText,
      sendEmail: true,
    });
  }
  await prisma.activityLog.create({ data: { userId: admin.id, action: "users.updated", module: "users", metadata: { affectedUserId: parsed.data.userId, emailChanged: currentUser.email !== parsed.data.email, statusChanged: currentUser.status !== parsed.data.status, passwordChanged: Boolean(passwordHash) } } });

  revalidatePath("/admin/users");
  revalidatePath("/admin/dashboard");

  return { ok: true, message: "User updated successfully." };
}

export async function updateUserRolesAction(
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const admin = await requirePermission("users", "assign-roles", "/admin/users");

  const userId = Number(formData.get("userId"));
  const roleIds = await roleIdsWithMemberBase(
    formData
      .getAll("roles")
      .map((roleId) => Number(roleId))
      .filter(Number.isFinite),
  );

  if (!Number.isFinite(userId)) {
    return { ok: false, message: "Invalid user." };
  }

  if (await isSuperAdminUser(userId)) {
    return { ok: false, message: "Super Admin is internal and cannot be changed from roles." };
  }

  await prisma.userRole.deleteMany({ where: { userId } });

  if (roleIds.length > 0) {
    await prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
      skipDuplicates: true,
    });
  }

  await notifyUsers({
    userIds: [userId], type: "account", title: "Roles or permissions changed",
    message: "Your roles and access permissions were updated.", link: "/admin/dashboard",
    sourceType: "user", sourceId: userId, dedupeKey: `account:${userId}:roles:${Date.now()}`,
  });
  await prisma.activityLog.create({ data: { userId: admin.id, action: "users.roles-updated", module: "users", metadata: { affectedUserId: userId, roleIds } } });

  revalidatePath("/admin/users");

  return { ok: true, message: "Roles updated successfully." };
}
