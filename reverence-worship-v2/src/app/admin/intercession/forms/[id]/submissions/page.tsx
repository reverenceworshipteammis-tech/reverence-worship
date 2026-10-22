import { redirectLegacyFormsPage, type LegacyFormSearchParams } from "@/app/admin/forms/legacy-route";

export default async function LegacyFormSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<LegacyFormSearchParams>;
}) {
  const { id } = await params;
  redirectLegacyFormsPage(`/admin/forms/${encodeURIComponent(id)}/submissions`, await searchParams);
}
