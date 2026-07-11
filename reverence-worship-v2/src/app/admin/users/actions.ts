"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function createUserAction(
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const admin = await requireAdminUser();
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
  const roleIds = formData
    .getAll("roles")
    .map((roleId) => Number(roleId))
    .filter(Number.isFinite);

  await prisma.user.create({
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

  revalidatePath("/admin/users");
  revalidatePath("/admin/dashboard");

  return { ok: true, message: "User created successfully." };
}

export async function runUserTableAction(formData: FormData) {
  await requireAdminUser();

  const userId = Number(formData.get("userId"));
  const action = String(formData.get("action") || "");

  if (!Number.isFinite(userId)) {
    return { ok: false, message: "Invalid user." };
  }

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
    await prisma.user.delete({
      where: { id: userId },
    });
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/dashboard");

  return { ok: true, message: "User updated successfully." };
}

export async function updateUserRoleAction(formData: FormData) {
  await requireAdminUser();

  const userId = Number(formData.get("userId"));
  const roleId = Number(formData.get("roleId"));

  if (!Number.isFinite(userId) || !Number.isFinite(roleId)) {
    return { ok: false, message: "Invalid role update." };
  }

  await prisma.userRole.deleteMany({ where: { userId } });
  await prisma.userRole.create({ data: { userId, roleId } });

  revalidatePath("/admin/users");

  return { ok: true, message: "Role updated successfully." };
}

export async function updateUserAction(
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  await requireAdminUser();

  const parsed = updateUserSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid user details." };
  }

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

  revalidatePath("/admin/users");
  revalidatePath("/admin/dashboard");

  return { ok: true, message: "User updated successfully." };
}

export async function updateUserRolesAction(
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  await requireAdminUser();

  const userId = Number(formData.get("userId"));
  const roleIds = formData
    .getAll("roles")
    .map((roleId) => Number(roleId))
    .filter(Number.isFinite);

  if (!Number.isFinite(userId)) {
    return { ok: false, message: "Invalid user." };
  }

  await prisma.userRole.deleteMany({ where: { userId } });

  if (roleIds.length > 0) {
    await prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/admin/users");

  return { ok: true, message: "Roles updated successfully." };
}
