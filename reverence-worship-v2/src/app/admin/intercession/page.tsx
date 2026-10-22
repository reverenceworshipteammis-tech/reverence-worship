import { IntercessionPage } from "@/components/intercession-page";
import { redirectLegacyFormsPage } from "@/app/admin/forms/legacy-route";
import { redirect } from "next/navigation";

export default async function IntercessionPageRoute({ searchParams }: { searchParams: Promise<{ tab?: string; section?: string }> }) {
  const params = await searchParams;
  if (params.tab === "bible") redirect("/admin/bible");
  if (params.tab === "forms" || ["available", "manage", "results", "reports"].includes(params.section ?? "")) {
    const formParams = { ...params };
    delete formParams.tab;
    redirectLegacyFormsPage("/admin/forms", formParams);
  }
  return IntercessionPage({ searchParams });
}
