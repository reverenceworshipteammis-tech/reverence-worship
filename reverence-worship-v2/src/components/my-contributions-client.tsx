"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, HandCoins, Receipt, X } from "lucide-react";
import { submitMyContributionPayment } from "@/app/admin/contributions/actions";

type TermRow = {
  term: number;
  percentage: number;
  target: number;
  paid: number;
  remaining: number;
  progress: number;
  status: string;
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

type Result = {
  ok: boolean;
  message: string;
};

export function MyContributionsClient({
  currentYear,
  availableYears,
  annualAmount,
  totalRequired,
  totalPaid,
  remainingAmount,
  progressPercent,
  hasContribution,
  terms,
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
  terms: TermRow[];
  payments: PaymentRow[];
}) {
  const router = useRouter();
  const [paymentTerm, setPaymentTerm] = useState<TermRow | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function changeYear(year: string) {
    router.push(`/admin/contributions?year=${year}`);
  }

  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentTerm) return;

    const formData = new FormData(event.currentTarget);
    formData.set("year", String(currentYear));
    formData.set("term", String(paymentTerm.term));
    setResult(null);

    startTransition(async () => {
      const response = await submitMyContributionPayment(formData);
      setResult(response);
      if (response.ok) {
        setPaymentTerm(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-2 py-4 sm:px-4 sm:py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Contributions</h1>
          
        </div>
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

      {result && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${result.ok ? "border-green-100 bg-green-50 text-green-700" : "border-red-100 bg-red-50 text-red-700"}`}>
          {result.message}
        </div>
      )}

      {!hasContribution && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your annual contribution has not been set for {currentYear}. Please contact the finance team.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-bold text-gray-800 sm:text-lg">Your {currentYear} Annual Contribution</h2>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-gray-600">Annual Amount:</span>
              <span className="text-xl font-bold text-blue-600 sm:text-2xl">{formatCurrency(totalRequired || annualAmount)}</span>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-gray-500">Term Breakdown:</p>
              {terms.map((term) => (
                <div key={term.term} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-gray-600">Term {term.term} ({formatPercent(term.percentage)}%):</span>
                  <span className="whitespace-nowrap text-right font-medium">{formatCurrency(term.target)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <h4 className="mb-2 text-sm font-bold text-blue-800">2 Abakorinto 9:7</h4>
              <p className="text-xs italic leading-relaxed text-blue-700">
                &quot;Umuntu wese atange nk&apos;uko abigambiriye mu mutima he, atinuba kandi adahatwa kuko Imana ikunda utanga anezerewe.&quot;
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 text-base font-bold text-gray-800 sm:text-lg">My Progress</h2>

          <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:justify-between">
            <span className="text-sm text-gray-600">Overall Progress</span>
            <span className="text-sm font-medium text-gray-900">{formatCurrency(totalPaid)} / {formatCurrency(totalRequired)}</span>
          </div>

          <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${progressPercent}%` }} />
          </div>

          <p className="mb-5 text-xs text-gray-500">{progressPercent}% complete. {formatCurrency(remainingAmount)} remaining.</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {terms.map((term) => (
              <TermCard key={term.term} term={term} disabled={!hasContribution || term.status === "completed"} onPay={() => setPaymentTerm(term)} />
            ))}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-base font-bold text-gray-900 sm:text-lg">Payment History</h2>
            <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">Your payments for {currentYear}.</p>
          </div>
          <span className="inline-flex w-fit items-center justify-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {payments.length} {payments.length === 1 ? "payment" : "payments"}
          </span>
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
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">Term {payment.term ?? "-"}</td>
                      <td className="px-6 py-4 text-sm font-bold text-green-700">{formatCurrency(payment.amount)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatLabel(payment.paymentMethod)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{payment.referenceNumber || "-"}</td>
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
                    {payment.referenceNumber && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Reference</span>
                        <span className="break-all text-right font-medium text-gray-800">{payment.referenceNumber}</span>
                      </div>
                    )}
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
            <p className="mt-1 text-xs text-gray-500">Your payment history will appear here after you submit a payment.</p>
          </div>
        )}
      </section>

      {paymentTerm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-600/50 p-3">
          <div className="w-full max-w-md rounded-2xl border bg-white p-4 shadow-lg sm:p-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-800">Submit Payment - Term {paymentTerm.term}</h3>
              <button type="button" onClick={() => setPaymentTerm(null)} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={submitPayment} className="mt-4 space-y-4">
              <div className="rounded-xl bg-gray-50 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Term target</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(paymentTerm.target)}</span>
                </div>
                <div className="mt-1 flex justify-between gap-3">
                  <span className="text-gray-500">Already paid</span>
                  <span className="font-semibold text-green-700">{formatCurrency(paymentTerm.paid)}</span>
                </div>
                <div className="mt-1 flex justify-between gap-3">
                  <span className="text-gray-500">Remaining</span>
                  <span className="font-semibold text-blue-700">{formatCurrency(paymentTerm.remaining)}</span>
                </div>
              </div>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Amount *</span>
                <input name="amount" type="number" min="1" step="0.01" defaultValue={Math.ceil(paymentTerm.remaining || paymentTerm.target)} required className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Payment Method</span>
                <select name="paymentMethod" defaultValue="cash" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Notes</span>
                <textarea name="notes" rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
              <div className="flex flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setPaymentTerm(null)} className="rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-800 hover:bg-gray-300">Cancel</button>
                <button type="submit" disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{pending ? "Submitting..." : "Submit Payment"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TermCard({ term, disabled, onPay }: { term: TermRow; disabled: boolean; onPay: () => void }) {
  const completed = term.status === "completed";
  const partial = term.status === "partial";
  const colors = completed
    ? "border-green-200 bg-green-50"
    : partial
      ? "border-yellow-200 bg-yellow-50"
      : "border-gray-200 bg-white";
  const bar = completed ? "bg-green-500" : partial ? "bg-yellow-500" : "bg-gray-300";

  return (
    <div className={`rounded-2xl border p-4 transition hover:shadow-sm ${colors}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Term {term.term}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{formatPercent(term.percentage)}% of annual</p>
        </div>
        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${completed ? "bg-green-100 text-green-700" : partial ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>
          {completed && <Check className="size-3" />}
          {formatLabel(term.status)}
        </span>
      </div>
      <div className="mt-3">
        <p className="text-lg font-bold text-gray-900 sm:text-xl">{formatCurrency(term.paid)}</p>
        <p className="text-xs text-gray-500">of {formatCurrency(term.target)}</p>
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-gray-200">
        <div className={`h-1.5 rounded-full ${bar}`} style={{ width: `${term.progress}%` }} />
      </div>
      {completed ? (
        <p className="mt-3 text-xs text-green-600">Fully paid</p>
      ) : (
        <button type="button" onClick={onPay} disabled={disabled} className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
          <HandCoins className="mr-2 size-4" />
          {term.paid > 0 ? "Pay Remaining" : "Submit Payment"}
        </button>
      )}
    </div>
  );
}

function formatCurrency(value: number) {
  return `RWF ${Math.round(value).toLocaleString()}`;
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
