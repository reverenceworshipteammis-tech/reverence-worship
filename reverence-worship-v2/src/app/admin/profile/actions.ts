"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_TYPES } from "@/lib/membership-types";
import { educationFieldsSchema, parseAdditionalQualifications } from "@/lib/education-rules";

const optionalText = (max: number) => z.string().trim().max(max).optional();

const profileSchema = z.object({
  name: z.string().trim().min(2, "Full name must contain at least 2 characters.").max(120),
  phone: optionalText(40),
  gender: z.enum(["", "male", "female", "other"]).optional(),
  dateOfBirth: z.string().trim().optional(),
  maritalStatus: optionalText(50),
  membershipType: z.enum(MEMBERSHIP_TYPES),
  occupation: optionalText(120),
  province: optionalText(100),
  district: optionalText(100),
  sector: optionalText(100),
  cell: optionalText(100),
  village: optionalText(100),
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
  const profileValues = Object.fromEntries(formData);
  const parsed = profileSchema.safeParse(profileValues);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid profile details." };
  }

  let educationData;
  try {
    const parsedEducation = educationFieldsSchema.safeParse({
      highestEducationLevel: profileValues.highestEducationLevel,
      educationFieldOfStudy: profileValues.educationFieldOfStudy ?? "",
      additionalQualifications: parseAdditionalQualifications(profileValues.additionalQualifications),
    });
    if (!parsedEducation.success) {
      return { ok: false, message: parsedEducation.error.issues[0]?.message ?? "Invalid educational information." };
    }
    educationData = parsedEducation.data;
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Invalid additional qualifications." };
  }

  const hasEducationDetails =
    educationData.highestEducationLevel !== "none" && educationData.highestEducationLevel !== "primary";
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name,
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
        highestEducationLevel: educationData.highestEducationLevel,
        educationFieldOfStudy: hasEducationDetails ? educationData.educationFieldOfStudy : null,
      },
    });
    if (formData.has("additionalQualifications")) {
      await tx.educationQualification.deleteMany({ where: { userId: user.id } });
      if (educationData.additionalQualifications.length) {
        await tx.educationQualification.createMany({
          data: educationData.additionalQualifications.map((qualification) => ({
            ...qualification,
            userId: user.id,
          })),
        });
      }
    }
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "profile.updated",
        module: "profile",
      },
    });
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/admin/profile");

  return { ok: true, message: "Your profile was updated successfully." };
}
