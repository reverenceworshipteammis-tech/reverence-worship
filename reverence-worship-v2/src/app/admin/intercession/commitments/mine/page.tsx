import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CommitmentSnapshot } from "@/lib/membership-commitment";
import { IntercessionRichText } from "@/components/intercession-rich-text";
import { parseIntercessionFormSettings } from "@/lib/intercession-form-domain";

export default async function MyCommitmentsPage() {
  const user = await requireUser();
  const records = (await prisma.membershipCommitment.findMany({ where: { userId: user.id }, include: { form: { select: { settings: true } } }, orderBy: { acceptedAt: "desc" } }))
    .filter((record) => parseIntercessionFormSettings(record.form.settings).allow_view_response);
  return <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6"><Link href="/admin/intercession?section=results" className="text-sm font-semibold text-blue-700">← My Results</Link><h1 className="text-2xl font-bold text-slate-900">My annual commitments</h1>{records.map((record) => {
    const snapshot = record.snapshot as unknown as CommitmentSnapshot;
    return <Link key={record.id} href={`/admin/intercession/commitments/${record.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-300"><span><strong className="block text-slate-900"><IntercessionRichText value={snapshot.formTitle} /></strong><span className="mt-1 block text-sm text-slate-500">{record.year} · Accepted {new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Kigali", dateStyle: "medium", timeStyle: "short" }).format(record.acceptedAt)}</span></span><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">View commitment</span></Link>;
  })}{!records.length ? <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">You have not accepted an annual commitment yet. Open an available commitment form to begin.</p> : null}</main>;
}
