const MAX_ANNUAL_CONTRIBUTION = 9_999_999_999_999.99;

export function parseAnnualContributionAmount(value: string) {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_ANNUAL_CONTRIBUTION) return null;

  return amount;
}

export function canMemberCommitAnnualContribution(setting: { allowMemberCommitment: boolean } | null | undefined) {
  return setting?.allowMemberCommitment === true;
}
