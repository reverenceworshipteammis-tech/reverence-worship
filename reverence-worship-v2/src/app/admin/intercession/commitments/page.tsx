import { redirectLegacyFormsPage, type LegacyFormSearchParams } from "@/app/admin/forms/legacy-route";

export default async function LegacyCommitmentReportsPage({ searchParams }: { searchParams: Promise<LegacyFormSearchParams> }) {
  redirectLegacyFormsPage("/admin/forms/commitments", await searchParams);
}
