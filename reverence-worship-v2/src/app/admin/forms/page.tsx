import { IntercessionPage } from "@/components/intercession-page";

export default async function FormsPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const params = await searchParams;
  return IntercessionPage({
    searchParams: Promise.resolve({ tab: "forms", section: params.section }),
    standaloneForms: true,
  });
}
