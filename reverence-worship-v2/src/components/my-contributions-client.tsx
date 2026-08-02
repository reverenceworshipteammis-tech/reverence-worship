"use client";

import { commitAnnualContribution } from "@/app/admin/contributions/actions";
import { ActionNotice } from "@/components/action-notice";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, ChevronDown, HandCoins, Receipt, Users, X } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";

type TermRow = {
  term: number;
  percentage: number;
  target: number;
  paid: number;
  remaining: number;
  progress: number;
  status: string;
  lastPaymentDate: string | null;
};

type PaymentRow = {
  id: number;
  term: number | null;
  amount: number;
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
  status: string;
  paymentDate: string;
};

type EventContributionRow = {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: string;
  totalRaised: number;
  contributorCount: number;
  totalMembers: number;
  memberPaid: number;
  payments: Array<{
    id: number;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
  }>;
};

const termAllocationColors = ["bg-blue-600", "bg-violet-500", "bg-sky-400", "bg-amber-400"];

export function MyContributionsClient({
  currentYear,
  availableYears,
  annualAmount,
  totalRequired,
  totalPaid,
  remainingAmount,
  progressPercent,
  hasContribution,
  canCommit,
  commitmentEnabled,
  terms,
  events,
  payments,
}: {
  currentYear: number;
  availableYears: number[];
  annualAmount: number;
  totalRequired: number;
  totalPaid: number;
  remainingAmount: number;
  progressPercent: number;
  hasContribution: boolean;
  canCommit: boolean;
  commitmentEnabled: boolean;
  terms: TermRow[];
  events: EventContributionRow[];
  payments: PaymentRow[];
}) {
  const router = useRouter();
  const [commitmentOpen, setCommitmentOpen] = useState(false);
  const [draftAmount, setDraftAmount] = useState(annualAmount > 0 ? String(annualAmount) : "");
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const progressBarWidth = Math.max(0, Math.min(100, progressPercent));

  function changeYear(year: string) {
    router.push(`/admin/contributions?year=${year}`);
  }

  function openCommitment() {
    setDraftAmount(annualAmount > 0 ? String(annualAmount) : "");
    setNotice(null);
    setCommitmentOpen(true);
  }

  function submitCommitment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await commitAnnualContribution(formData);
        setNotice(result);
        if (result.ok) {
          setCommitmentOpen(false);
          router.refresh();
        }
      } catch {
        setNotice({ ok: false, message: "Your annual contribution could not be saved. Please try again." });
      }
    });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-2 py-4 sm:px-4 sm:py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Contributions</h1>
          
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
          {canCommit ? (
            <button
              type="button"
              onClick={openCommitment}
              disabled={!commitmentEnabled}
              title={commitmentEnabled ? undefined : `Member contribution commitments are closed for ${currentYear}`}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none sm:w-auto"
            >
              <HandCoins className="size-4" aria-hidden="true" />
              {hasContribution ? "Update Annual Contribution" : "Set Annual Contribution"}
            </button>
          ) : null}
          <label className="w-full sm:w-40">
            <span className="mb-1 block text-xs font-medium text-gray-600">Year</span>
            <span className="relative block">
              <select value={currentYear} onChange={(event) => changeYear(event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-3 pr-9 text-sm font-semibold text-gray-800 outline-none transition hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            </span>
          </label>
        </div>
      </div>

      {notice ? (
        <ActionNotice message={notice.message} tone={notice.ok ? "success" : "error"} onClose={() => setNotice(null)} />
      ) : null}

      {!hasContribution && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your annual contribution has not been set for {currentYear}. {canCommit && commitmentEnabled
            ? "Use Set Annual Contribution to commit the amount you wish to give."
            : canCommit
              ? "Member contribution commitments are currently closed. Please contact the finance team."
              : "Please contact the finance team."}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 bg-gradient-to-r from-blue-50/70 via-white to-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
          <div>
            <h2 className="text-base font-bold text-gray-900 sm:text-lg">{currentYear} Contribution Overview</h2>
            <p className="mt-1 text-xs text-gray-500 sm:text-sm">Your annual plan and payment progress in one place.</p>
          </div>
          <span className="inline-flex w-fit items-center rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700">{progressPercent}% complete</span>
        </div>

        <div className="p-4 sm:p-6 lg:p-7">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(240px,0.32fr)_minmax(0,0.68fr)] lg:items-stretch lg:gap-8">
            <div className="flex flex-col justify-center rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-5 sm:p-6">
              <h3 className="text-sm font-bold text-gray-900 sm:text-base">Contribution Plan</h3>
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Annual Commitment</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-blue-600 sm:text-3xl">{formatCurrency(totalRequired || annualAmount)}</p>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Allocation by Term</p>
                  <span className="text-xs text-gray-400">100% total</span>
                </div>
                <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-gray-100" aria-label="Annual contribution allocation by term">
                  {terms.map((term) => (
                    <span key={term.term} className={termAllocationColors[(term.term - 1) % termAllocationColors.length]} style={{ width: `${term.percentage}%` }} title={`Term ${term.term}: ${formatPercent(term.percentage)}%`} />
                  ))}
                </div>
                <div className="mt-2 flex" aria-label="Term allocation percentages">
                  {terms.map((term) => (
                    <span key={term.term} className="text-center text-[11px] font-bold text-gray-600" style={{ width: `${term.percentage}%` }} aria-label={`Term ${term.term}: ${formatPercent(term.percentage)}%`}>
                      {formatPercent(term.percentage)}%
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 border-t border-gray-100 pt-5">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <h3 className="text-sm font-bold text-gray-900 sm:text-base">My Progress</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Paid</span>
                    <span className="text-lg font-bold tracking-tight text-gray-900">{formatCurrency(totalPaid)}</span>
                  </div>
                </div>

                <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-label={`${progressPercent}% overall contribution progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressBarWidth}>
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${progressBarWidth}%` }} />
                </div>

                <p className="text-xs text-gray-500">{formatCurrency(remainingAmount)} remaining on your annual commitment.</p>
              </div>
            </div>
          </div>

          <div className="mt-7 border-t border-gray-100 pt-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900 sm:text-base">Term Progress</h3>
              <p className="mt-1 text-xs text-gray-500">Payment status and balances for each contribution term.</p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {terms.map((term) => (
                <TermCard key={term.term} term={term} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gradient-to-r from-violet-50/70 via-white to-white p-4 sm:p-6">
          <h2 className="text-base font-bold text-gray-900 sm:text-lg">Other Contributions</h2>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">Special giving opportunities managed separately from your annual commitment.</p>
        </div>

        {events.length ? (
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2 sm:p-6">
            {events.map((event) => {
              const participation = event.totalMembers > 0 ? Math.round((event.contributorCount / event.totalMembers) * 1000) / 10 : 0;

              return (
                <article key={event.id} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:shadow-md sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900">{event.title}</h3>
                      {event.description ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{event.description}</p> : null}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${event.status === "active" ? "bg-emerald-100 text-emerald-700" : event.status === "expired" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>{event.status}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5 text-violet-500" />{event.startDate}{event.endDate !== "-" ? ` – ${event.endDate}` : ""}</span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-emerald-50 p-3">
                      <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700"><HandCoins className="size-3.5" />Community Raised</p>
                      <p className="mt-1 text-sm font-bold text-emerald-900">{formatCurrency(event.totalRaised)}</p>
                    </div>
                    <div className="rounded-xl bg-violet-50 p-3">
                      <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700"><Users className="size-3.5" />Participation</p>
                      <p className="mt-1 text-sm font-bold text-violet-900">{event.contributorCount} of {event.totalMembers} · {formatPercent(participation)}%</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl bg-blue-50/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-blue-700">My Contribution</span>
                      <span className="text-base font-bold text-blue-900">{formatCurrency(event.memberPaid)}</span>
                    </div>
                    {event.payments.length ? (
                      <div className="mt-2 space-y-1.5 border-t border-blue-100 pt-2">
                        {event.payments.slice(0, 3).map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between gap-3 text-[11px] text-blue-700">
                            <span>{payment.paymentDate} · {formatLabel(payment.paymentMethod)}</span>
                            <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                          </div>
                        ))}
                        {event.payments.length > 3 ? <p className="text-[11px] text-blue-500">+{event.payments.length - 3} more payments</p> : null}
                      </div>
                    ) : <p className="mt-1 text-[11px] text-blue-600">No payment recorded for this event yet.</p>}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <HandCoins className="mx-auto size-8 text-gray-300" />
            <p className="mt-3 text-sm font-semibold text-gray-700">No other contributions for {currentYear}</p>
            <p className="mt-1 text-xs text-gray-500">Active special giving opportunities will appear here.</p>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-base font-bold text-gray-900 sm:text-lg">Payment History</h2>
            <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">Your payments for {currentYear}.</p>
          </div>
        </div>

        {payments.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Term</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">Term {payment.term ?? "-"}</td>
                      <td className="px-6 py-4 text-sm font-bold text-green-700">{formatCurrency(payment.amount)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatLabel(payment.paymentMethod)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{payment.paymentDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-gray-100 md:hidden">
              {payments.map((payment) => (
                <div key={payment.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Term {payment.term ?? "-"}</p>
                      <p className="mt-1 text-xs text-gray-500">{payment.paymentDate}</p>
                    </div>
                    <p className="whitespace-nowrap text-sm font-bold text-green-700">{formatCurrency(payment.amount)}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-600">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Method</span>
                      <span className="text-right font-medium text-gray-800">{formatLabel(payment.paymentMethod)}</span>
                    </div>
                    {payment.notes && <p className="rounded-xl bg-gray-50 p-3 text-gray-500">{payment.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <Receipt className="size-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-700">No payments recorded for {currentYear}</p>
            <p className="mt-1 text-xs text-gray-500">Your payment history will appear here after the finance team records a payment.</p>
          </div>
        )}
      </section>

      {commitmentOpen ? (
        <AnnualCommitmentModal
          year={currentYear}
          amount={draftAmount}
          terms={terms}
          pending={pending}
          onAmountChange={setDraftAmount}
          onClose={() => setCommitmentOpen(false)}
          onSubmit={submitCommitment}
        />
      ) : null}
    </div>
  );
}

function AnnualCommitmentModal({
  year,
  amount,
  terms,
  pending,
  onAmountChange,
  onClose,
  onSubmit,
}: {
  year: number;
  amount: string;
  terms: TermRow[];
  pending: boolean;
  onAmountChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const numericAmount = Number(amount);
  const previewAmount = Number.isFinite(numericAmount) && numericAmount > 0 ? numericAmount : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="annual-commitment-title"
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 id="annual-commitment-title" className="text-lg font-bold text-gray-900">Set Annual Contribution</h2>
            <p className="mt-1 text-sm text-gray-500">Commit the total amount you wish to contribute in {year}.</p>
          </div>
          <button type="button" onClick={onClose} disabled={pending} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 p-5">
          <input type="hidden" name="year" value={year} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-gray-700">Annual amount (RWF)</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">RWF</span>
              <input
                name="annual_amount"
                type="number"
                min="1"
                max="9999999999999.99"
                step="0.01"
                required
                autoFocus
                value={amount}
                onChange={(event) => onAmountChange(event.target.value)}
                placeholder="Enter your annual amount"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-14 pr-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </label>

          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
            <p className="text-sm font-semibold text-blue-900">Administrator term distribution</p>
            <p className="mt-1 text-xs leading-5 text-blue-700">Your annual amount will be divided automatically using the percentages set by administrators.</p>
            <div className="mt-3 space-y-2">
              {terms.map((term) => (
                <div key={term.term} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-blue-800">Term {term.term} ({formatPercent(term.percentage)}%)</span>
                  <span className="font-semibold text-blue-950">{formatCurrency((previewAmount * term.percentage) / 100)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={pending} className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-60">Cancel</button>
            <button type="submit" disabled={pending || previewAmount <= 0} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
              <HandCoins className="size-4" aria-hidden="true" />
              {pending ? "Saving..." : "Commit Annual Amount"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function TermCard({ term }: { term: TermRow }) {
  const completed = term.status === "completed";
  const partial = term.status === "partial";
  const amountAboveTarget = Math.max(0, term.paid - term.target);
  const surface = completed
    ? "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white shadow-emerald-100/70"
    : partial
      ? "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white shadow-amber-100/70"
      : "border-slate-200 bg-white shadow-slate-100/70";
  const accent = completed ? "bg-emerald-500" : partial ? "bg-amber-500" : "bg-slate-300";
  const badge = completed
    ? "bg-emerald-100 text-emerald-700"
    : partial
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-600";

  return (
    <article className={`relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border p-3.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${surface}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} aria-hidden="true" />

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <h3 className="text-sm font-bold text-slate-800">Term {term.term}</h3>
        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold ${badge}`}>
          {completed ? <Check className="size-3" aria-hidden="true" /> : <span className={`size-1.5 rounded-full ${accent}`} aria-hidden="true" />}
          {formatLabel(term.status)}
        </span>
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Paid</p>
        <p className="mt-0.5 truncate text-lg font-bold tracking-tight text-slate-950">{formatCurrency(term.paid)}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">of {formatCurrency(term.target)}</p>
      </div>

      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/60"
        role="progressbar"
        aria-label={`Term ${term.term} payment progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={term.progress}
      >
        <div className={`h-full rounded-full transition-all ${accent}`} style={{ width: `${term.progress}%` }} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200/70 pt-3 text-[11px]">
        <span className="text-slate-500">{amountAboveTarget > 0 ? "Above target" : "Remaining"}</span>
        <span className={`truncate text-right font-bold ${completed ? "text-emerald-700" : "text-slate-800"}`}>{formatCurrency(amountAboveTarget > 0 ? amountAboveTarget : term.remaining)}</span>
      </div>
    </article>
  );
}

function formatCurrency(value: number) {
  const amount = Math.round(value * 100) / 100;
  return `RWF ${amount.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPercent(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
