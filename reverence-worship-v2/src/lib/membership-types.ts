export const MEMBERSHIP_TYPES = ["permanent", "temporary", "partner"] as const;

export type MembershipType = typeof MEMBERSHIP_TYPES[number];

const membershipLabels: Record<MembershipType, string> = {
  permanent: "Permanent",
  temporary: "Temporary",
  partner: "Partner",
};

export const membershipTypeOptions = MEMBERSHIP_TYPES.map((value) => ({ value, label: membershipLabels[value] }));
export const membershipTypeFilterOptions: Array<[MembershipType, string]> = MEMBERSHIP_TYPES.map((value) => [value, membershipLabels[value]]);

/** Accept old imports, saved recipient filters, and bookmarked Visitor filters. */
export function normalizeMembershipType(value: unknown): MembershipType | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "visitor") return "partner";
  return MEMBERSHIP_TYPES.find((type) => type === normalized) ?? null;
}

export function membershipTypeLabel(value: unknown, fallback = "Not specified"): string {
  const type = normalizeMembershipType(value);
  return type ? membershipLabels[type] : fallback;
}

export function parseMembershipTypeFilters(value: unknown): MembershipType[] {
  const values = typeof value === "string" ? value.split(",") : Array.isArray(value) ? value : [];
  return [...new Set(values.map(normalizeMembershipType).filter((type): type is MembershipType => type !== null))];
}

export function importedMembershipType(value: string): MembershipType | null {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("temporary")) return "temporary";
  if (normalized.includes("visitor") || normalized.includes("partner")) return "partner";
  if (normalized.includes("permanent")) return "permanent";
  return normalized ? "permanent" : null;
}
