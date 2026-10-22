import { redirectLegacyFormsPage, type LegacyFormSearchParams } from "@/app/admin/forms/legacy-route";

export default async function LegacyCreateFormPage({ searchParams }: { searchParams: Promise<LegacyFormSearchParams> }) {
  redirectLegacyFormsPage("/admin/forms/create", await searchParams);
}
