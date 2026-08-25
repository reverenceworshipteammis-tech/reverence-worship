import type { Metadata } from "next";
import { ProjectionOutput } from "@/components/projection-output";

export const metadata: Metadata = {
  title: "Projector Output · Reverence Worship",
  robots: { index: false, follow: false },
};

export default async function ProjectionOutputPage({ searchParams }: { searchParams: Promise<{ shell?: string | string[] }> }) {
  const params = await searchParams;
  return <ProjectionOutput nativeFullscreen={params.shell === "desktop"} />;
}
