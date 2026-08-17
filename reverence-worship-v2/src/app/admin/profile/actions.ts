"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { notifyEmailAddress, notifyUsers } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const optionalText = (max: number) => z.string().trim().max(max).optional();

const profileSchema = z.object({
  name: z.string().trim().min(2, "Full name must contain at least 2 characters.").max(120),
  email: z.email("Enter a valid email address.").trim().toLowerCase().max(254),
  phone: optionalText(40),
  gender: z.enum(["", "male", "female", "other"]).optional(),
  dateOfBirth: z.string().trim().optional(),
  maritalStatus: optionalText(50),
  membershipType: z.enum(["", "permanent", "temporary", "visitor"]).optional(),
  occupation: optionalText(120),
  province: optionalText(100),
  district: optionalText(100),
  sector: optionalText(100),
  cell: optionalText(100),
  village: optionalText(100),
  emergencyName: optionalText(120),
  emergencyPhone: optionalText(40),
  notes: optionalText(1000),
}).superRefine((data, context) => {
  if (!data.dateOfBirth) return;

  const date = new Date(`${data.dateOfBirth}T12:00:00Z`);
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(data.dateOfBirth) &&
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === data.dateOfBirth &&
    date <= new Date();

  if (!validDate) {
    context.addIssue({ code: "custom", path: ["dateOfBirth"], message: "Enter a valid date of birth." });
  }
});

export type ProfileActionState = {
  ok?: boolean;
  message?: string;
};

export async function updateOwnProfileAction(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await requirePermission("profile", "edit", "/admin/dashboard");
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid profile details." };
  }

  const existingUser = await prisma.user.findFirst({
    where: { email: parsed.data.email, id: { not: user.id } },
    select: { id: true },
  });
  if (existingUser) {
    return { ok: false, message: "Another user already uses this email address." };
  }

  const previousEmail = user.email;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        gender: parsed.data.gender || null,
        dateOfBirth: parsed.data.dateOfBirth ? new Date(`${parsed.data.dateOfBirth}T12:00:00Z`) : null,
        maritalStatus: parsed.data.maritalStatus || null,
        membershipType: parsed.data.membershipType || null,
        occupation: parsed.data.occupation || null,
        province: parsed.data.province || null,
        district: parsed.data.district || null,
        sector: parsed.data.sector || null,
        cell: parsed.data.cell || null,
        village: parsed.data.village || null,
        emergencyName: parsed.data.emergencyName || null,
        emergencyPhone: parsed.data.emergencyPhone || null,
        notes: parsed.data.notes || null,
      },
    }),
    prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "profile.updated",
        module: "profile",
        metadata: { emailChanged: previousEmail !== parsed.data.email },
      },
    }),
  ]);

  if (previousEmail !== parsed.data.email) {
    await Promise.allSettled([
      notifyEmailAddress(
        previousEmail,
        "Email address changed",
        `The email address on your Reverence Worship account was changed to ${parsed.data.email}. Contact an administrator immediately if you did not request this.`,
      ),
      notifyUsers({
        userIds: [user.id],
        type: "security",
        title: "Email address changed",
        message: `Your account email was changed from ${previousEmail}.`,
        link: "/admin/profile",
        sourceType: "user",
        sourceId: user.id,
        dedupeKey: `account:${user.id}:email:${Date.now()}`,
      }),
    ]);
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/admin/profile");

  return { ok: true, message: "Your profile was updated successfully." };
}
