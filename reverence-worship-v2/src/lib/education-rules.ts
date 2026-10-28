import { z } from "zod";

export const EDUCATION_LEVELS = [
  { value: "none", label: "No Formal Education" },
  { value: "primary", label: "Primary Level" },
  { value: "secondary_a2", label: "Secondary School (A2)" },
  { value: "diploma_a1", label: "Diploma (A1)" },
  { value: "bachelors_a0", label: "Bachelor's Degree (A0)" },
  { value: "masters", label: "Master's Degree" },
  { value: "doctoral", label: "Doctoral Degree (PhD)" },
  { value: "other", label: "Other (Please Specify)" },
] as const;

export const BILINGUAL_EDUCATION_LABELS: Record<(typeof EDUCATION_LEVELS)[number]["value"], string> = {
  none: "Ntabwo Nize / No Formal Education",
  primary: "Amashuri Abanza / Primary Education",
  secondary_a2: "Amashuri Yisumbuye (A2) / Secondary Education (A2)",
  diploma_a1: "Icyiciro cya 1 cya Kaminuza / Diploma (A1)",
  bachelors_a0: "Icyiciro cya 2 cya Kaminuza / Bachelor's Degree (A0)",
  masters: "Icyiciro cya 3 cya Kaminuza / Master's Degree",
  doctoral: "Impamyabumenyi y'Ikirenga (PhD) / Doctoral Degree (PhD)",
  other: "Ibindi (Bisobanure) / Other (Please Specify)",
};

export const QUALIFICATION_STATUSES = [
  { value: "completed", label: "Completed" },
  { value: "studying", label: "Currently Studying" },
  { value: "planned", label: "Planned" },
] as const;

export type QualificationStatus = (typeof QUALIFICATION_STATUSES)[number]["value"];

export type EducationQualification = {
  name: string;
  fieldOfStudy: string;
  institution: string;
  status: QualificationStatus;
  completionYear: number;
};

const qualificationSchema = z.object({
  name: z.string().trim().min(1, "Enter a qualification or certificate name.").max(160),
  fieldOfStudy: z.string().trim().min(1, "Enter the qualification field of study.").max(160),
  institution: z.string().trim().min(1, "Enter the institution or training provider.").max(160),
  status: z.enum(["completed", "studying", "planned"]),
  completionYear: z.coerce.number().int().min(1900).max(2100),
});

export const educationFieldsSchema = z.object({
  highestEducationLevel: z.enum(EDUCATION_LEVELS.map(({ value }) => value) as [string, ...string[]]),
  otherEducationLevel: z.string().trim().max(160),
  educationFieldOfStudy: z.string().trim().max(160),
  additionalQualifications: z.array(qualificationSchema),
}).superRefine((data, context) => {
  if (data.highestEducationLevel === "other" && !data.otherEducationLevel) {
    context.addIssue({
      code: "custom",
      path: ["otherEducationLevel"],
      message: "Specify your highest education qualification.",
    });
  }
  if (data.highestEducationLevel !== "none" && data.highestEducationLevel !== "primary") {
    if (!data.educationFieldOfStudy) {
      context.addIssue({ code: "custom", path: ["educationFieldOfStudy"], message: "Enter your field of study." });
    }
  }
});

export type EducationFields = z.infer<typeof educationFieldsSchema>;

export function parseAdditionalQualifications(value: unknown): EducationQualification[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      throw new Error("Additional qualifications must be a list.");
    }
    return parsed as EducationQualification[];
  } catch {
    throw new Error("Additional qualifications could not be read. Please review and submit them again.");
  }
}

export function educationLevelLabel(value: string | null | undefined) {
  return EDUCATION_LEVELS.find((level) => level.value === value)?.label ?? value ?? "";
}
