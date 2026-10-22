import { redirectLegacyFormsPage, type LegacyFormSearchParams } from "@/app/admin/forms/legacy-route";

export default async function LegacyMyCommitmentsPage({ searchParams }: { searchParams: Promise<LegacyFormSearchParams> }) {
  redirectLegacyFormsPage("/admin/forms/commitments/mine", await searchParams);
}
