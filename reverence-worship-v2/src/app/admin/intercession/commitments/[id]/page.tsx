import { redirectLegacyFormsPage, type LegacyFormSearchParams } from "@/app/admin/forms/legacy-route";

export default async function LegacyCommitmentRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<LegacyFormSearchParams>;
}) {
  const { id } = await params;
  redirectLegacyFormsPage(`/admin/forms/commitments/${encodeURIComponent(id)}`, await searchParams);
}
