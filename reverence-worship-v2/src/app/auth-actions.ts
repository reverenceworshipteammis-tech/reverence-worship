"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AuthState = {
  error?: string;
};

const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1, "Password is required."),
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

  redirect("/admin/dashboard");
}

export async function registerAction(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid registration details." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existingUser) {
    return { error: "An account with this email already exists." };
  }

  const userCount = await prisma.user.count();
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

  if (!firstUser) {
    return {
      error: "Registration received. An admin must activate your account before login.",
    };
  }

  await createSession(user.id);
  redirect("/admin/dashboard");
}
