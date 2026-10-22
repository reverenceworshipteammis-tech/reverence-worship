import { BibleReader } from "@/components/bible-reader";
import { requirePermission } from "@/lib/auth";

export default async function BiblePage() {
  await requirePermission("intercession", "read-bible");

  return (
    <div className="mx-auto max-w-[1600px] px-2 py-3 sm:px-4 sm:py-5 lg:px-6">
      <BibleReader />
    </div>
  );
}
