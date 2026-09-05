"use server";

import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, requireUser } from "@/lib/auth";
import { isTransientDatabaseError, withDatabaseRetry } from "@/lib/database-retry";
import { prisma } from "@/lib/prisma";
import { getSystemSetting, isRegistrationEnabled, settingToNumber } from "@/lib/system-settings";
import { notifyUsers, userIdsWithPermission } from "@/lib/notifications";
import { authPathWithReturnTo, safeAuthReturnPath } from "@/lib/auth-return-path";

type AuthState = {
  error?: string;
  success?: string;
};

function registrationFailure(error: unknown): AuthState {
  console.error("Registration submission failed.", error);
  return {
    error: isTransientDatabaseError(error)
      ? "The registration service is temporarily unavailable. Please wait a moment and try again."
      : "We couldn't submit your registration. Please try again.",
  };
}

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
    cell: z.string().trim().min(1, "Cell is required."),
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
  cell: z.string().trim().min(1, "Cell is required."),
  village: z.string().trim().min(1, "Village is required."),
});

export async function loginAction(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const returnTo = safeAuthReturnPath(formData.get("returnTo"));
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid login details." };
  }

  let user;
  try {
    user = await withDatabaseRetry(() => prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, passwordHash: true, status: true, mustChangePassword: true, sessionVersion: true },
    }), 3);
  } catch (error) {
    console.error("Login database lookup failed.", error);
    return { error: "Unable to sign in right now. Please try again shortly." };
  }

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

  await createSession(user.id, { sessionVersion: user.sessionVersion });

  if (user.mustChangePassword) {
    redirect(authPathWithReturnTo("/change-password", returnTo));
  }

  redirect(returnTo);
}

export async function requiredPasswordChangeAction(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const returnTo = safeAuthReturnPath(formData.get("returnTo"));
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

  redirect(returnTo);
}

export async function completeGoogleProfileAction(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const returnTo = safeAuthReturnPath(formData.get("returnTo"));
  const user = await requireUser();

  if (!user.googleId) {
    redirect(returnTo);
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
      cell: parsed.data.cell,
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

  redirect(returnTo);
}

export async function registerAction(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  let registrationEnabled: boolean;
  let userCount: number;
  let passwordMinLengthSetting: unknown;

  try {
    [registrationEnabled, userCount, passwordMinLengthSetting] = await withDatabaseRetry(() => Promise.all([
      isRegistrationEnabled(),
      prisma.user.count(),
      getSystemSetting("password_min_length"),
    ]), 3);
  } catch (error) {
    return registrationFailure(error);
  }

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

  let existingUser;
  try {
    existingUser = await withDatabaseRetry(() => prisma.user.findUnique({
      where: { email: parsed.data.email },
    }), 3);
  } catch (error) {
    return registrationFailure(error);
  }

  if (existingUser) {
    return { error: "An account with this email already exists." };
  }

  const firstUser = userCount === 0;
  const roleName = firstUser ? "super-admin" : "member";
  let role;
  try {
    role = await withDatabaseRetry(() => prisma.role.findUniqueOrThrow({ where: { name: roleName } }), 3);
  } catch (error) {
    return registrationFailure(error);
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  let user;
  try {
    user = await prisma.user.create({
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
        cell: parsed.data.cell,
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
  } catch (error) {
    return registrationFailure(error);
  }

  try {
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
  } catch (error) {
    // The account is already stored. A notification outage must not make the
    // user resubmit the same registration or hide the successful outcome.
    console.error(`Registration notifications failed for user ${user.id}.`, error);
  }

  if (!firstUser) {
    return {
      success: "Your registration has been submitted successfully and is pending administrator approval.",
    };
  }

  await createSession(user.id, { sessionVersion: user.sessionVersion });
  redirect("/admin/dashboard");
}
