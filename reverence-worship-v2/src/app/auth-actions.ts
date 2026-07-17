"use server";

import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSystemSetting, isRegistrationEnabled, settingToNumber } from "@/lib/system-settings";
import { notifyUsers, userIdsWithPermission } from "@/lib/notifications";

type AuthState = {
  error?: string;
  success?: string;
};

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordResetAction(_previousState: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!z.email().safeParse(email).success) return { error: "Enter a valid email address." };
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (user) {
    const token = randomBytes(32).toString("hex");
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } }),
    ]);
    await notifyUsers({ userIds: [user.id], type: "security", title: "Password reset requested", message: "A password reset was requested for your account. The secure link expires in one hour. If this was not you, ignore this message.", link: `/reset-password?token=${token}`, sourceType: "user", sourceId: user.id, dedupeKey: `password-reset:${user.id}:${Date.now()}` });
  }
  return { success: "If an account exists for that email, a reset link has been sent." };
}

export async function completePasswordResetAction(_previousState: AuthState, formData: FormData): Promise<AuthState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("passwordConfirmation") ?? "");
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (password !== confirmation) return { error: "Passwords do not match." };
  const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash: tokenHash(token) }, select: { id: true, userId: true, expiresAt: true, usedAt: true } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) return { error: "This reset link is invalid or has expired." };
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.userId }, data: { passwordHash, mustChangePassword: false } }),
    prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
  ]);
  await notifyUsers({ userIds: [reset.userId], type: "security", title: "Password reset completed", message: "Your password was reset successfully. Contact an administrator immediately if you did not make this change.", link: "/login", sourceType: "user", sourceId: reset.userId, dedupeKey: `password-reset:${reset.id}:completed` });
  return { success: "Password reset successfully. You can now sign in." };
}

const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1, "Password is required."),
});

const requiredPasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    password: z.string().min(6, "Password must be at least 6 characters."),
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords do not match.",
    path: ["passwordConfirmation"],
  })
  .refine((data) => data.password !== "Pass@123", {
    message: "Choose a new password different from the default password.",
    path: ["password"],
  });

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters."),
    email: z.email().trim().toLowerCase(),
    phone: z.string().trim().min(5, "Phone number is required."),
    dateOfBirth: z.string().min(1, "Date of birth is required."),
    gender: z.enum(["male", "female"]),
    maritalStatus: z.string().trim().min(1, "Marital status is required."),
    province: z.string().trim().min(1, "Province is required."),
    district: z.string().trim().min(1, "District is required."),
    sector: z.string().trim().min(1, "Sector is required."),
    village: z.string().trim().min(1, "Village is required."),
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const googleProfileCompletionSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  phone: z.string().trim().min(5, "Phone number is required."),
  dateOfBirth: z.string().min(1, "Date of birth is required."),
  gender: z.enum(["male", "female"]),
  maritalStatus: z.string().trim().min(1, "Marital status is required."),
  province: z.string().trim().min(1, "Province is required."),
  district: z.string().trim().min(1, "District is required."),
  sector: z.string().trim().min(1, "Sector is required."),
  village: z.string().trim().min(1, "Village is required."),
});

export async function loginAction(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid login details." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { roles: { include: { role: true } } },
  });

  if (!user?.passwordHash) {
    return { error: "Invalid email or password." };
  }

  if (user.status !== "active") {
    return { error: "Your account is not active yet." };
  }

  const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);

  if (!passwordMatches) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);

  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  redirect("/admin/dashboard");
}

export async function requiredPasswordChangeAction(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const user = await requireUser();
  const parsed = requiredPasswordChangeSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password details." };
  }

  if (!user.passwordHash) {
    return { error: "This account does not use password sign-in." };
  }

  const currentMatches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!currentMatches) {
    return { error: "Current password is incorrect." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  await notifyUsers({
    userIds: [user.id],
    type: "security",
    title: "Password changed",
    message: "Your password was changed successfully.",
    link: "/admin/profile",
    sourceType: "user",
    sourceId: user.id,
    dedupeKey: `required-password-change:${user.id}:${Date.now()}`,
  });

  redirect("/admin/dashboard");
}

export async function completeGoogleProfileAction(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const user = await requireUser();

  if (!user.googleId) {
    redirect("/admin/dashboard");
  }

  const parsed = googleProfileCompletionSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Complete all required details." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      dateOfBirth: new Date(parsed.data.dateOfBirth),
      gender: parsed.data.gender,
      maritalStatus: parsed.data.maritalStatus,
      membershipType: user.membershipType ?? "permanent",
      province: parsed.data.province,
      district: parsed.data.district,
      sector: parsed.data.sector,
      village: parsed.data.village,
    },
  });

  await notifyUsers({
    userIds: [user.id],
    type: "account",
    title: "Profile completed",
    message: "Your required profile details were completed.",
    link: "/admin/profile",
    sourceType: "user",
    sourceId: user.id,
    dedupeKey: `google-profile-completed:${user.id}`,
  });

  redirect("/admin/dashboard");
}

export async function registerAction(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const [registrationEnabled, userCount, passwordMinLengthSetting] = await Promise.all([
    isRegistrationEnabled(),
    prisma.user.count(),
    getSystemSetting("password_min_length"),
  ]);

  if (!registrationEnabled && userCount > 0) {
    return { error: "Public registration is currently disabled." };
  }

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid registration details." };
  }

  const passwordMinLength = settingToNumber(passwordMinLengthSetting, 6);
  if (parsed.data.password.length < passwordMinLength) {
    return { error: `Password must be at least ${passwordMinLength} characters.` };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existingUser) {
    return { error: "An account with this email already exists." };
  }

  const firstUser = userCount === 0;
  const roleName = firstUser ? "super-admin" : "member";
  const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      dateOfBirth: new Date(parsed.data.dateOfBirth),
      gender: parsed.data.gender,
      maritalStatus: parsed.data.maritalStatus,
      membershipType: "permanent",
      province: parsed.data.province,
      district: parsed.data.district,
      sector: parsed.data.sector,
      village: parsed.data.village,
      passwordHash,
      status: firstUser ? "active" : "pending",
      roles: {
        create: {
          roleId: role.id,
        },
      },
    },
  });

  await notifyUsers({
    userIds: [user.id],
    type: "account",
    title: "Registration submitted",
    message: firstUser
      ? "Your account has been created and activated."
      : "Your registration was received and is awaiting administrator approval.",
    link: "/admin/dashboard",
    sourceType: "user",
    sourceId: user.id,
    dedupeKey: `registration:${user.id}:submitted`,
  });

  if (!firstUser) {
    const approverIds = await userIdsWithPermission("users", "change-status");
    await notifyUsers({
      userIds: approverIds,
      type: "account",
      title: "New account awaiting approval",
      message: `${user.name} submitted a registration and is awaiting approval.`,
      link: "/admin/users",
      sourceType: "user",
      sourceId: user.id,
      dedupeKey: `registration:${user.id}:approval`,
    });
  }

  if (!firstUser) {
    return {
      error: "Registration received. An admin must activate your account before login.",
    };
  }

  await createSession(user.id);
  redirect("/admin/dashboard");
}
