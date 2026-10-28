import { z } from "zod";
import { MEMBERSHIP_TYPES, membershipTypeLabel } from "@/lib/membership-types";
import { EDUCATION_LEVELS, educationLevelLabel } from "@/lib/education-rules";

const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed"] as const;

export const COMMITMENT_PROFILE_FIELDS = [
  { key: "name", label: "Full name", type: "text", max: 120 },
  { key: "email", label: "Email address", type: "email", max: 254, readOnly: true },
  { key: "phone", label: "Phone number", type: "tel", max: 40 },
  { key: "gender", label: "Gender", type: "select", options: ["male", "female"], max: 20 },
  { key: "dateOfBirth", label: "Date of birth", type: "date", max: 10 },
  { key: "maritalStatus", label: "Marital status", type: "select", options: MARITAL_STATUSES, max: 50 },
  { key: "membershipType", label: "Membership type", type: "select", options: MEMBERSHIP_TYPES, max: 20 },
  { key: "occupation", label: "Occupation", type: "text", max: 120 },
  { key: "highestEducationLevel", label: "Highest education level", type: "select", options: EDUCATION_LEVELS.map(({ value }) => value), max: 30 },
  { key: "educationFieldOfStudy", label: "Education field of study", type: "text", max: 160 },
  { key: "province", label: "Province", type: "text", max: 100 },
  { key: "district", label: "District", type: "text", max: 100 },
  { key: "sector", label: "Sector", type: "text", max: 100 },
  { key: "cell", label: "Cell", type: "text", max: 100 },
  { key: "village", label: "Village", type: "text", max: 100 },
  { key: "emergencyName", label: "Emergency contact name", type: "text", max: 120 },
  { key: "emergencyPhone", label: "Emergency contact phone", type: "tel", max: 40 },
  { key: "skills", label: "Skills", type: "text", max: 1000 },
] as const;

export const CONFIGURABLE_COMMITMENT_PROFILE_FIELDS = COMMITMENT_PROFILE_FIELDS.filter(
  ({ key }) => !["emergencyName", "emergencyPhone", "skills"].includes(key),
);

export type CommitmentProfileKey = typeof COMMITMENT_PROFILE_FIELDS[number]["key"];
export type CommitmentProfileValues = Partial<Record<CommitmentProfileKey, string>>;
export type CommitmentProfileField = { key: CommitmentProfileKey; editable: boolean; required: boolean; requiresApproval: boolean };
export type CommitmentSettings = {
  year: number;
  terms: string;
  acceptanceLabel: string;
  profileFields: CommitmentProfileField[];
  membershipTypes: Array<typeof MEMBERSHIP_TYPES[number]>;
};
export type CommitmentAudienceMember = { id: number; name: string; membershipType: string | null };
export type CommitmentProfileChange = { key: CommitmentProfileKey; label: string; before: string; after: string; requiresApproval: boolean };
export type CommitmentSnapshot = {
  formTitle: string;
  formDescription: string;
  memberId: number | null;
  memberName: string;
  terms: string;
  acceptanceLabel: string;
  accepted: true;
  profile: Array<{ key: CommitmentProfileKey; label: string; value: string }>;
  questions: unknown[];
  answers: Record<string, unknown>;
};

const keys = CONFIGURABLE_COMMITMENT_PROFILE_FIELDS.map((field) => field.key) as [CommitmentProfileKey, ...CommitmentProfileKey[]];
const educationDependentKeys = ["educationFieldOfStudy"] as const;
const settingsSchema = z.object({
  year: z.number().int().min(2000).max(2200),
  terms: z.string().max(100_000),
  acceptanceLabel: z.string().max(2000),
  profileFields: z.array(z.object({ key: z.enum(keys), editable: z.boolean(), required: z.boolean(), requiresApproval: z.boolean() })).max(keys.length),
  membershipTypes: z.array(z.enum(MEMBERSHIP_TYPES)).min(1).max(3),
});

function withoutRemovedCommitmentFields(value: unknown) {
  if (!value || typeof value !== "object" || !("profileFields" in value) || !Array.isArray(value.profileFields)) {
    return value;
  }
  return {
    ...value,
    profileFields: value.profileFields.filter((field) =>
      field && typeof field === "object" && "key" in field
        && !["emergencyName", "emergencyPhone", "skills", "educationInstitution", "educationCompletionYear", "otherEducationLevel"].includes(String(field.key)),
    ),
  };
}

function includeEducationDependencies(fields: CommitmentProfileField[]) {
  const educationLevel = fields.find((field) => field.key === "highestEducationLevel");
  if (!educationLevel) return fields;
  const configuredKeys = new Set(fields.map((field) => field.key));
  return [
    ...fields,
    ...educationDependentKeys
      .filter((key) => !configuredKeys.has(key))
      .map((key) => ({ key, editable: true, required: false, requiresApproval: false })),
  ];
}

function normalizeCommitmentSettings(value: unknown) {
  const normalized = withoutRemovedCommitmentFields(value);
  if (!normalized || typeof normalized !== "object" || !("profileFields" in normalized) || !Array.isArray(normalized.profileFields)) return normalized;
  const fields = normalized.profileFields as CommitmentProfileField[];
  return { ...normalized, profileFields: includeEducationDependencies(fields) };
}

export function commitmentAcceptanceLabel(year: number) {
  return `I have read and understood the Worship Team membership commitment for ${year}. I voluntarily agree to respect and fulfill the responsibilities described above.`;
}

export function defaultCommitmentSettings(year: number): CommitmentSettings {
  return {
    year, terms: "", acceptanceLabel: commitmentAcceptanceLabel(year), membershipTypes: [...MEMBERSHIP_TYPES],
    profileFields: ["name", "email", "phone", "membershipType"].map((key) => ({
      key: key as CommitmentProfileKey, editable: !["email", "membershipType"].includes(key), required: ["name", "email", "phone", "membershipType"].includes(key), requiresApproval: false,
    })),
  };
}

export function commitmentConfigurationIssue(value: unknown, publishing = false): string | null {
  if (value == null) return null;
  const result = settingsSchema.safeParse(normalizeCommitmentSettings(value));
  if (!result.success) return "Check the commitment year, member fields, and acceptance configuration.";
  const config = result.data;
  if (new Set(config.profileFields.map((field) => field.key)).size !== config.profileFields.length) return "Select each member field only once.";
  if (publishing && !config.profileFields.length) return "Select at least one member information field.";
  return null;
}

export function parseCommitmentSettings(value: unknown): CommitmentSettings | null {
  const result = settingsSchema.safeParse(normalizeCommitmentSettings(value));
  if (!result.success) return null;
  return {
    ...result.data,
    // Older forms may store a subset. All current membership types are eligible
    // now that the audience selector is no longer part of form configuration.
    membershipTypes: [...MEMBERSHIP_TYPES],
    profileFields: result.data.profileFields.map((field) => {
      const definition = COMMITMENT_PROFILE_FIELDS.find((item) => item.key === field.key)!;
      const editable = field.editable && !("readOnly" in definition && definition.readOnly);
      return { ...field, editable, requiresApproval: false };
    }),
  };
}

export function commitmentProfileValues(user: object): CommitmentProfileValues {
  const source = user as Record<string, unknown>;
  return Object.fromEntries(COMMITMENT_PROFILE_FIELDS.map(({ key }) => {
    const value = source[key] instanceof Date
      ? source[key].toISOString().slice(0, 10)
      : typeof source[key] === "string" || typeof source[key] === "number"
        ? String(source[key])
        : "";
    return [key, key === "maritalStatus" ? MARITAL_STATUSES.find((status) => status.toLowerCase() === value.trim().toLowerCase()) ?? value : value];
  }));
}

export function commitmentProfileDisplay(key: CommitmentProfileKey, value: string) {
  if (key === "membershipType") return membershipTypeLabel(value);
  if (key === "gender" && value) return value[0].toUpperCase() + value.slice(1);
  if (key === "highestEducationLevel") return educationLevelLabel(value);
  return value || "Not specified";
}

export function validateCommitmentProfile(config: CommitmentSettings, current: CommitmentProfileValues, incoming: FormData, now = new Date()) {
  const values: CommitmentProfileValues = {};
  const changes: CommitmentProfileChange[] = [];
  const educationLevelField = config.profileFields.find((field) => field.key === "highestEducationLevel");
  const rawEducationLevel = educationLevelField?.editable ? incoming.get("profile_highestEducationLevel") : current.highestEducationLevel;
  const educationLevel = typeof rawEducationLevel === "string" ? rawEducationLevel.trim() : "";
  for (const field of config.profileFields) {
    const definition = COMMITMENT_PROFILE_FIELDS.find((item) => item.key === field.key)!;
    const raw = incoming.get(`profile_${field.key}`);
    const value = field.editable ? typeof raw === "string" ? raw.trim() : "" : current[field.key] ?? "";
    const educationRequired = field.key === "educationFieldOfStudy" && educationLevel !== "" && educationLevel !== "none" && educationLevel !== "primary";
    const conditionalEducationField = educationLevelField && field.key === "educationFieldOfStudy";
    if ((conditionalEducationField ? educationRequired : field.required || educationRequired) && !value) return { ok: false as const, message: `${definition.label} is required.` };
    if (value.length > definition.max) return { ok: false as const, message: `${definition.label} is too long.` };
    if (field.editable && field.key === "name" && value.length < 2) return { ok: false as const, message: "Full name must contain at least 2 characters." };
    if (field.editable && field.key === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { ok: false as const, message: "Enter a valid email address." };
    if (field.editable && field.key === "membershipType" && !value) return { ok: false as const, message: "Select a membership type." };
    if (field.editable && value) {
      if ("options" in definition && !(definition.options as readonly string[]).includes(value)) return { ok: false as const, message: `Select a valid ${definition.label.toLowerCase()}.` };
      if (field.key === "dateOfBirth") {
        const date = new Date(`${value}T00:00:00Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value || date > now) return { ok: false as const, message: "Enter a valid date of birth." };
      }
    }
    values[field.key] = value;
    if (field.editable && value !== (current[field.key] ?? "")) changes.push({ key: field.key, label: definition.label, before: current[field.key] ?? "", after: value, requiresApproval: false });
  }
  return { ok: true as const, values, changes };
}

export function commitmentProfileUpdate(changes: CommitmentProfileChange[]) {
  return Object.fromEntries(changes.map((change) => [
    change.key,
    change.key === "dateOfBirth"
      ? change.after ? new Date(`${change.after}T12:00:00Z`) : null
      : change.after || null,
  ]));
}

export function parseCommitmentAudience(value: unknown): CommitmentAudienceMember[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    return Number.isInteger(item.id) && Number(item.id) > 0 && typeof item.name === "string"
      ? [{ id: Number(item.id), name: item.name, membershipType: typeof item.membershipType === "string" ? item.membershipType : null }] : [];
  });
}

export function parseCommitmentChanges(value: unknown): CommitmentProfileChange[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const item = entry as Partial<CommitmentProfileChange> | null;
    return item && keys.includes(item.key!) && typeof item.label === "string" && typeof item.before === "string" && typeof item.after === "string"
      ? [{ key: item.key!, label: item.label, before: item.before, after: item.after, requiresApproval: false }] : [];
  });
}
