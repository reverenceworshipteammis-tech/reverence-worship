import { redirectLegacyFormsPage, type LegacyFormSearchParams } from "@/app/admin/forms/legacy-route";

export default async function LegacyEditFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<LegacyFormSearchParams>;
}) {
  const { id } = await params;
  redirectLegacyFormsPage(`/admin/forms/${encodeURIComponent(id)}/edit`, await searchParams);
}
