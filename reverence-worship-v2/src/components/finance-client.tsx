"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAppDialog } from "@/components/app-dialog-provider";
import { ActionNotice } from "@/components/action-notice";
import { EventContributionsClient, type FinanceContributionEvent } from "@/components/event-contributions-client";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Calculator,
  CheckCircle2,
  ChartPie,
  ClipboardList,
  CreditCard,
  FileSearch2,
  FileSpreadsheet,
  FileText,
  FileUp,
  HandCoins,
  Hourglass,
  Minus,
  Pencil,
  Plus,
  PlusCircle,
  Receipt,
  Save,
  Search,
  Settings,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import {
  approveExpense,
  deleteFinanceActionPlan,
  deleteFinanceActionPlanTask,
  deactivateSponsor,
  rejectExpense,
  voidExpense,
  deleteFinancePayment,
  recordContributionPayment,
  recordSponsorPayment,
  reactivateSponsor,
  saveAnnualContribution,
  saveExpense,
  saveFinanceActionPlan,
  saveFinanceActionPlanTask,
  saveFinanceTermSettings,
  saveSponsor,
  updateTermContributionTotal,
  updateFinancePayment,
} from "@/app/admin/finance/actions";
import { calculateContributionRate } from "@/lib/finance-rules";

type UserOption = {
  id: number;
  name: string;
  email: string;
  familyId: number | null;
  familyName: string | null;
  familyYear: number | null;
  canApproveExpenses: boolean;
};

type FamilyOption = {
  id: number;
  name: string;
  year: number;
};

type Contribution = {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  year: number;
  annualAmount: number;
  status: string;
  notes: string | null;
};

type Payment = {
  id: number;
  userId: number | null;
  userName: string;
  userEmail: string;
  amount: number;
  paymentDateRaw: string;
  paymentDate: string;
  paymentMethod: string;
  term: number | null;
  year: number;
  status: string;
  notes: string | null;
  createdByName: string;
  createdAt: string;
  referenceNumber: string | null;
};

type GiftItem = {
  id: number;
  donorName: string;
  commitmentAmount: number;
  receivedAmount: number;
  giftType: string | null;
  status: string;
  dateRaw: string;
  date: string;
};

type Expense = {
  id: number;
  category: string | null;
  description: string | null;
  amount: number;
  dateRaw: string;
  date: string;
  status: string;
  year: number;
  createdByName: string;
  approvedByName: string | null;
  approverId1: number | null;
  approverId2: number | null;
  approver1Name: string | null;
  approver2Name: string | null;
  rejectionReason: string | null;
  voidReason: string | null;
  referenceNumber: string | null;
  hasReceipt: boolean;
};

type FinancePermissions = {
  manageContributions: boolean;
  managePayments: boolean;
  deletePayments: boolean;
  manageSettings: boolean;
  manageExpenses: boolean;
  approveExpenses: boolean;
  deleteExpenses: boolean;
  export: boolean;
  reconcile: boolean;
  viewReports: boolean;
};

type Sponsor = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  commitmentAmount: number;
  receivedAmount: number;
  fundType: string;
  status: string;
  notes: string | null;
  year: number;
  paymentsCount: number;
  payments: SponsorPayment[];
};

type SponsorPayment = {
  id: number;
  amount: number;
  paymentDateRaw: string;
  paymentDate: string;
  paymentMethod: string;
  notes: string | null;
  year: number | null;
  recordedBy: string;
};

type ActionPlan = {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  startDateRaw: string;
  dueDate: string;
  dueDateRaw: string;
  status: string;
  progress: number;
  createdByName: string;
  createdAt: string;
  tasks: ActionPlanTask[];
};

type ActionPlanTask = {
  id: number;
  actionPlanId: number;
  taskName: string;
  activity: string | null;
  targetMilestone: string | null;
  estimatedBudget: number;
  startDate: string;
  startDateRaw: string;
  deadline: string;
  deadlineRaw: string;
  progress: number;
  status: string;
  priority: string;
  assigneeName: string | null;
};

type FinanceTermSetting = {
  id: number;
  currentYear: number;
  numberOfTerms: number;
  termNumbers: number[];
  termPercentages: Record<string, number>;
  allowMemberCommitment: boolean;
};

type FinanceNotice = {
  ok: boolean;
  message: string;
};

type ConfirmAction = {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  action: () => Promise<void>;
};

export function FinanceClient({
  year,
  currentUserId,
  users,
  families,
  contributions,
  payments,
  contributionEvents,
  gifts,
  expenses,
  sponsors,
  actionPlans,
  termSettings,
  permissions,
}: {
  year: number;
  currentUserId: number;
  users: UserOption[];
  families: FamilyOption[];
  contributions: Contribution[];
  payments: Payment[];
  contributionEvents: FinanceContributionEvent[];
  gifts: GiftItem[];
  expenses: Expense[];
  sponsors: Sponsor[];
  actionPlans: ActionPlan[];
  termSettings: FinanceTermSetting[];
  permissions: FinancePermissions;
}) {
  const currentYearPayments = payments
    .filter((item) => item.year === year && item.status !== "voided")
    .sort((firstPayment, secondPayment) =>
      secondPayment.paymentDateRaw.localeCompare(firstPayment.paymentDateRaw)
      || secondPayment.createdAt.localeCompare(firstPayment.createdAt)
      || secondPayment.id - firstPayment.id,
    );
  const currentYearEventPayments = contributionEvents
    .filter((event) => event.year === year)
    .flatMap((event) => event.payments.map((payment) => ({ ...payment, eventTitle: event.title })))
    .sort((firstPayment, secondPayment) =>
      secondPayment.paymentDateRaw.localeCompare(firstPayment.paymentDateRaw)
      || secondPayment.createdAt.localeCompare(firstPayment.createdAt)
      || secondPayment.id - firstPayment.id,
    );
  const recentIncomePayments = [
    ...currentYearPayments.map((payment) => ({
      key: `annual-${payment.id}`,
      title: payment.userName,
      subtitle: `${payment.paymentDate} • ${payment.paymentMethod}`,
      amount: payment.amount,
      paymentDateRaw: payment.paymentDateRaw,
      createdAt: payment.createdAt,
      id: payment.id,
    })),
    ...currentYearEventPayments.map((payment) => ({
      key: `event-${payment.id}`,
      title: payment.userName,
      subtitle: `${payment.paymentDate} • ${payment.eventTitle}`,
      amount: payment.amount,
      paymentDateRaw: payment.paymentDateRaw,
      createdAt: payment.createdAt,
      id: payment.id,
    })),
  ].sort((firstPayment, secondPayment) =>
    secondPayment.paymentDateRaw.localeCompare(firstPayment.paymentDateRaw)
    || secondPayment.createdAt.localeCompare(firstPayment.createdAt)
    || secondPayment.id - firstPayment.id,
  );
  const [activeTab, setActiveTab] = useState("overview");
  const [contributionView, setContributionView] = useState<"annual" | "events">("annual");
  const [startDate, setStartDate] = useState(`${year}-01-01`);
  const [endDate, setEndDate] = useState(`${year}-12-31`);
  const tabs = [
    { id: "overview", label: "Overview", mobileLabel: "Home", icon: BarChart3 },
    ...(permissions.manageSettings ? [{ id: "settings", label: "Settings", mobileLabel: "Settings", icon: Settings }] : []),
    { id: "contributions", label: "Contributions", mobileLabel: "Contrib.", icon: HandCoins },
    { id: "payments", label: "Payments", mobileLabel: "Pay", icon: CreditCard },
    { id: "sponsors", label: "Sponsors", mobileLabel: "Sponsors", icon: Users },
    { id: "expenses", label: "Expenses", mobileLabel: "Expenses", icon: Receipt },
    ...(permissions.viewReports ? [{ id: "ledger", label: "Ledger & Reports", mobileLabel: "Reports", icon: FileSpreadsheet }] : []),
    { id: "action-plans", label: "Action Plans", mobileLabel: "Plans", icon: ClipboardList },
  ];

  const stats = useMemo(() => {
    const fromYear = Number(startDate.slice(0, 4)) || year;
    const toYear = Number(endDate.slice(0, 4)) || year;
    const memberCommitments = contributions.filter((item) => item.year >= fromYear && item.year <= toYear).reduce((sum, item) => sum + item.annualAmount, 0);
    const sponsorCommitments = sponsors.filter((item) => item.year >= fromYear && item.year <= toYear && item.status !== "inactive").reduce((sum, item) => sum + item.commitmentAmount, 0);
    const totalExpected = memberCommitments + sponsorCommitments;
    const inRange = (date: string) => (!startDate || date >= startDate) && (!endDate || date <= endDate);
    const totalCollected = payments.filter((item) => item.status !== "voided" && inRange(item.paymentDateRaw)).reduce((sum, item) => sum + item.amount, 0);
    const totalEventContributions = contributionEvents.flatMap((event) => event.payments).filter((item) => item.status !== "voided" && inRange(item.paymentDateRaw)).reduce((sum, item) => sum + item.amount, 0);
    const totalGifts = gifts.filter((item) => inRange(item.dateRaw)).reduce((sum, item) => sum + item.receivedAmount, 0);
    const totalSponsorReceived = sponsors.flatMap((item) => item.payments).filter((item) => inRange(item.paymentDateRaw)).reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenses.filter((item) => (item.status === "approved" || item.status === "void_pending") && inRange(item.dateRaw)).reduce((sum, item) => sum + item.amount, 0);
    const reservedExpenses = expenses.filter((item) => item.status === "pending" && inRange(item.dateRaw)).reduce((sum, item) => sum + item.amount, 0);
    const totalIncome = totalCollected + totalEventContributions + totalGifts + totalSponsorReceived;
    const committedIncomeReceived = totalCollected + totalSponsorReceived;
    const accountBalance = Math.max(totalIncome - totalExpenses - reservedExpenses, 0);
    const pendingAmount = Math.max(totalExpected - committedIncomeReceived, 0);
    const collectionRate = totalExpected ? Math.round((committedIncomeReceived / totalExpected) * 100) : 0;
    return {
      totalExpected,
      totalCollected,
      totalEventContributions,
      totalGifts,
      totalSponsorReceived,
      totalExpenses,
      totalIncome,
      accountBalance,
      pendingAmount,
      collectionRate,
      reservedExpenses,
    };
  }, [year, contributions, payments, contributionEvents, gifts, sponsors, expenses, startDate, endDate]);

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-2 py-4 sm:px-4 sm:py-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial Management</h1>
      </div>

      <div className="relative z-40 overflow-visible rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="md:hidden">
          <nav className="flex gap-1 overflow-x-auto px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-w-[68px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
                    active ? "bg-blue-600 text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span className="leading-none">{tab.mobileLabel}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="hidden border-b border-gray-200 md:block">
          <nav className="flex flex-wrap">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${active ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                >
                  <Icon className="size-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="p-3 sm:p-4">
          {activeTab === "overview" ? (
            <div className="space-y-5">
              <div className="flex flex-wrap justify-end gap-2">
                <FieldLabel label="From"><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-8 rounded-lg border border-gray-300 px-2 text-xs" /></FieldLabel>
                <FieldLabel label="To"><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-8 rounded-lg border border-gray-300 px-2 text-xs" /></FieldLabel>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FinanceStat label="Expected Amount" value={stats.totalExpected} tone="sky" icon={ChartPie} />
                <FinanceStat label="Total Income" value={stats.totalIncome} tone="emerald" icon={HandCoins} />
                <FinanceStat label="Total Expense" value={stats.totalExpenses} tone="rose" icon={Receipt} />
                <FinanceStat label="Account Balance" value={stats.accountBalance} tone="indigo" icon={Calculator} />
                <FinanceStat label="Pending Amount" value={stats.pendingAmount} tone="amber" icon={CreditCard} />
                <FinanceStat label="Collection Rate" value={stats.collectionRate} tone="violet" icon={BarChart3} format="percentage" />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <RecentList title="Recent Payments" empty="No payments yet">
                  {recentIncomePayments.slice(0, 5).map((payment) => (
                    <RecentRow key={payment.key} title={payment.title} subtitle={payment.subtitle} amount={payment.amount} />
                  ))}
                </RecentList>
                <RecentList title="Recent Expenses" empty="No expenses yet">
                  {expenses.slice(0, 5).map((expense) => (
                    <RecentRow key={expense.id} title={expense.category || "Expense"} subtitle={`${expense.date} • ${expenseStatusLabel(expense.status)}`} amount={expense.amount} danger />
                  ))}
                </RecentList>
              </div>
            </div>
          ) : activeTab === "contributions" ? (
            <div className="space-y-4">
              {contributionView === "annual" ? (
                <>
                  <div className="inline-flex rounded-lg bg-gray-100 p-1">
                    <button type="button" className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-blue-600 shadow-sm">Annual Contributions</button>
                    <button type="button" onClick={() => setContributionView("events")} className="rounded-md px-3 py-1.5 text-sm font-semibold text-gray-600 transition hover:text-gray-900">Other Contributions</button>
                  </div>
                  <FinanceContributionsTab
                    currentYear={year}
                    users={users}
                    families={families}
                    contributions={contributions}
                    payments={payments}
                    termSettings={termSettings}
                    fromDate={startDate}
                    toDate={endDate}
                    setFromDate={setStartDate}
                    setToDate={setEndDate}
                  />
                </>
              ) : (
                <EventContributionsClient
                  events={contributionEvents}
                  users={users}
                  onShowAnnual={() => setContributionView("annual")}
                  permissions={{
                    manageContributions: permissions.manageContributions,
                    managePayments: permissions.managePayments,
                    deletePayments: permissions.deletePayments,
                    export: permissions.export,
                  }}
                />
              )}
            </div>
          ) : activeTab === "payments" ? (
            <FinancePaymentsTab
              currentYear={year}
              payments={payments}
              users={users}
              termSettings={termSettings}
              fromDate={startDate}
              toDate={endDate}
              setFromDate={setStartDate}
              setToDate={setEndDate}
            />
          ) : activeTab === "sponsors" ? (
            <FinanceSponsorsTab currentYear={year} sponsors={sponsors} fromDate={startDate} toDate={endDate} setFromDate={setStartDate} setToDate={setEndDate} />
          ) : activeTab === "expenses" ? (
            <FinanceExpensesTab
              currentYear={year}
              currentUserId={currentUserId}
              accountBalance={stats.accountBalance}
              expenses={expenses}
              users={users}
              permissions={permissions}
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          ) : activeTab === "ledger" ? (
            <FinanceLedgerReportsTab
              payments={payments}
              contributionEvents={contributionEvents}
              gifts={gifts}
              sponsors={sponsors}
              expenses={expenses}
              permissions={permissions}
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          ) : activeTab === "action-plans" ? (
            <FinanceActionPlansTab currentYear={year} actionPlans={actionPlans} />
          ) : (
            <FinanceSettingsTab currentYear={year} settings={termSettings} />
          )}
        </div>
      </div>
    </div>
  );
}

function FinanceLedgerReportsTab({ payments, contributionEvents, gifts, sponsors, expenses, permissions, startDate, endDate, onStartDateChange, onEndDateChange }: {
  payments: Payment[];
  contributionEvents: FinanceContributionEvent[];
  gifts: GiftItem[];
  sponsors: Sponsor[];
  expenses: Expense[];
  permissions: FinancePermissions;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}) {
  const [requestedPage, setRequestedPage] = useState(1);
  const entries = useMemo(() => {
    const rows = [
      ...payments.filter((item) => item.status !== "voided").map((item) => ({ sourceType: "payment", sourceId: item.id, date: item.paymentDateRaw, description: item.userName, income: item.amount, expense: 0, status: item.status })),
      ...contributionEvents.flatMap((event) => event.payments.filter((item) => item.status !== "voided").map((item) => ({ sourceType: "event_contribution_payment", sourceId: item.id, date: item.paymentDateRaw, description: `${event.title} - ${item.userName}`, income: item.amount, expense: 0, status: item.status }))),
      ...gifts.filter((item) => item.receivedAmount > 0).map((item) => ({ sourceType: "gift", sourceId: item.id, date: item.dateRaw, description: `Gift - ${item.donorName}`, income: item.receivedAmount, expense: 0, status: item.status })),
      ...sponsors.flatMap((sponsor) => sponsor.payments.map((item) => ({ sourceType: "sponsor_payment", sourceId: item.id, date: item.paymentDateRaw, description: `Sponsor payment - ${sponsor.name}`, income: item.amount, expense: 0, status: "completed" }))),
      ...expenses.filter((item) => item.status === "approved" || item.status === "void_pending").map((item) => ({ sourceType: "expense", sourceId: item.id, date: item.dateRaw, description: item.description || "Expense", income: 0, expense: item.amount, status: item.status })),
    ].filter((item) => (!startDate || item.date >= startDate) && (!endDate || item.date <= endDate));
    return rows.sort((a, b) => a.date.localeCompare(b.date) || a.sourceId - b.sourceId).reduce<Array<(typeof rows)[number] & { balance: number }>>((ledger, row) => {
      const balance = (ledger.at(-1)?.balance ?? 0) + row.income - row.expense;
      return [...ledger, { ...row, balance }];
    }, []);
  }, [payments, contributionEvents, gifts, sponsors, expenses, startDate, endDate]);
  const income = entries.reduce((sum, item) => sum + item.income, 0);
  const spent = entries.reduce((sum, item) => sum + item.expense, 0);
  const reserved = expenses.filter((item) => item.status === "pending" && (!startDate || item.dateRaw >= startDate) && (!endDate || item.dateRaw <= endDate)).reduce((sum, item) => sum + item.amount, 0);
  const displayEntries = useMemo(() => [...entries].reverse(), [entries]);
  const recordsPerPage = 30;
  const totalPages = Math.max(1, Math.ceil(displayEntries.length / recordsPerPage));
  const currentPage = Math.min(requestedPage, totalPages);
  const firstRecordIndex = (currentPage - 1) * recordsPerPage;
  const paginatedEntries = displayEntries.slice(firstRecordIndex, firstRecordIndex + recordsPerPage);

  function exportReport() {
    const rows = [["Date", "Description", "Type", "Income", "Expense", "Running Balance", "Status"], ...entries.map((item) => [item.date, item.description, item.sourceType, item.income, item.expense, item.balance, item.status])];
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finance_report_${startDate}_to_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return <div className="space-y-4">
    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
   
      <div className="flex flex-wrap items-end gap-2">
        <FieldLabel label="From"><input type="date" value={startDate} onChange={(event) => { onStartDateChange(event.target.value); setRequestedPage(1); }} className="h-8 rounded-lg border border-gray-300 px-2 text-xs" /></FieldLabel>
        <FieldLabel label="To"><input type="date" value={endDate} onChange={(event) => { onEndDateChange(event.target.value); setRequestedPage(1); }} className="h-8 rounded-lg border border-gray-300 px-2 text-xs" /></FieldLabel>
        {permissions.export ? <button type="button" onClick={exportReport} className="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white">Export Excel</button> : null}
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ExpenseStat label="Income" value={income} tone="green" icon={HandCoins} />
      <ExpenseStat label="Approved expense" value={spent} tone="blue" icon={Receipt} />
      <ExpenseStat label="Reserved pending" value={reserved} tone="yellow" icon={Hourglass} />
      <ExpenseStat label="Closing balance" value={Math.max(income - spent, 0)} tone="green" icon={Calculator} />
    </div>
    {income - spent - reserved < income * 0.1 && income > 0 ? <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="size-4" />Available funds after pending approvals are below 10% of income.</div> : null}
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm"><thead className="bg-gray-50"><tr>{["Date", "Description", "Income", "Expense", "Balance"].map((label) => <th key={label} className="px-3 py-2 text-left text-xs uppercase text-gray-500">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100">{paginatedEntries.length ? paginatedEntries.map((item) => {
          return <tr key={`${item.sourceType}-${item.sourceId}`}><td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">{item.date}</td><td className="px-3 py-2 text-gray-800">{item.description}</td><td className="px-3 py-2 font-medium text-emerald-600">{item.income ? formatCurrency(item.income) : "-"}</td><td className="px-3 py-2 font-medium text-red-600">{item.expense ? formatCurrency(item.expense) : "-"}</td><td className="px-3 py-2 font-semibold">{formatCurrency(item.balance)}</td></tr>;
        }) : <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">No transactions in this date range.</td></tr>}</tbody></table>
      </div>
      {displayEntries.length > recordsPerPage ? (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row">
          <p className="text-xs text-gray-500">Showing {firstRecordIndex + 1}–{Math.min(firstRecordIndex + recordsPerPage, displayEntries.length)} of {displayEntries.length} records</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={currentPage === 1} onClick={() => setRequestedPage(currentPage - 1)} className="h-8 rounded-lg border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
            <span className="min-w-20 text-center text-xs font-medium text-gray-600">Page {currentPage} of {totalPages}</span>
            <button type="button" disabled={currentPage === totalPages} onClick={() => setRequestedPage(currentPage + 1)} className="h-8 rounded-lg border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
          </div>
        </div>
      ) : null}
    </div>
  </div>;
}

function FinanceActionPlansTab({ currentYear, actionPlans }: { currentYear: number; actionPlans: ActionPlan[] }) {
  const router = useRouter();
  const [planModal, setPlanModal] = useState<ActionPlan | "new" | null>(null);
  const [taskModal, setTaskModal] = useState<{ plan: ActionPlan; task?: ActionPlanTask } | null>(null);
  const [viewPlan, setViewPlan] = useState<ActionPlan | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [pending, startTransition] = useTransition();

  const summary = useMemo(() => {
    const tasks = actionPlans.flatMap((plan) => plan.tasks);
    const today = new Date().toISOString().slice(0, 10);
    const dueSoonLimit = new Date();
    dueSoonLimit.setDate(dueSoonLimit.getDate() + 7);
    const dueSoon = dueSoonLimit.toISOString().slice(0, 10);
    return {
      overdueTasks: tasks.filter((task) => task.deadlineRaw && task.deadlineRaw < today && task.progress < 100).length,
      dueSoonTasks: tasks.filter((task) => task.deadlineRaw && task.deadlineRaw >= today && task.deadlineRaw <= dueSoon && task.progress < 100).length,
      myTodoTasks: tasks.filter((task) => task.progress < 100).length,
    };
  }, [actionPlans]);

  function closePlanModal() {
    setPlanModal(null);
  }

  function closeTaskModal() {
    setTaskModal(null);
  }

  function submitPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("year", String(currentYear));
    if (planModal && planModal !== "new") formData.set("id", String(planModal.id));

    startTransition(async () => {
      const result = await saveFinanceActionPlan(formData);
      setMessage(result);
      if (result.ok) {
        closePlanModal();
        router.refresh();
      }
    });
  }

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskModal) return;
    const formData = new FormData(event.currentTarget);
    formData.set("actionPlanId", String(taskModal.plan.id));
    if (taskModal.task) formData.set("id", String(taskModal.task.id));

    startTransition(async () => {
      const result = await saveFinanceActionPlanTask(formData);
      setMessage(result);
      if (result.ok) {
        closeTaskModal();
        router.refresh();
      }
    });
  }

  function removePlan(plan: ActionPlan) {
    setConfirmAction({
      title: "Delete Action Plan",
      message: `Delete "${plan.title}" and all of its tasks? This action cannot be undone.`,
      confirmLabel: "Delete Plan",
      action: async () => {
        const result = await deleteFinanceActionPlan(plan.id);
        setMessage(result);
        if (result.ok) {
          setConfirmAction(null);
          router.refresh();
        }
      },
    });
  }

  function removeTask(task: ActionPlanTask) {
    setConfirmAction({
      title: "Delete Task",
      message: `Delete "${task.activity || task.taskName}" from this action plan?`,
      confirmLabel: "Delete Task",
      action: async () => {
        const result = await deleteFinanceActionPlanTask(task.id);
        setMessage(result);
        if (result.ok) {
          setConfirmAction(null);
          router.refresh();
        }
      },
    });
  }

  function exportTasks(plan: ActionPlan) {
    const rows = [
      ["No", "Activity", "Milestone", "Budget", "Start Date", "Deadline", "Progress", "Status"],
      ...plan.tasks.map((task, index) => [
        index + 1,
        task.activity ?? task.taskName,
        task.targetMilestone ?? "",
        task.estimatedBudget,
        task.startDate,
        task.deadline,
        `${task.progress}%`,
        task.status.replace("_", " "),
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${plan.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-tasks.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const editingPlan = planModal && planModal !== "new" ? planModal : null;
  const editingTask = taskModal?.task ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Financial Management Action Plans</h2>
        <button type="button" onClick={() => setPlanModal("new")} className="inline-flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
          <Plus className="size-4" />
          Create New Action Plan
        </button>
      </div>

      {message && (
        <FinanceNoticeBanner notice={message} onClose={() => setMessage(null)} />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ActionSummaryCard label="Overdue Tasks" value={summary.overdueTasks} tone="rose" />
        <ActionSummaryCard label="To-Be-Overdue Within 7 Days" value={summary.dueSoonTasks} tone="amber" />
        <ActionSummaryCard label="My TO DO" value={summary.myTodoTasks} tone="sky" />
      </div>

      <div className="space-y-4">
        {actionPlans.length ? actionPlans.map((plan) => {
          const totalBudget = plan.tasks.reduce((sum, task) => sum + task.estimatedBudget, 0);
          return (
            <article key={plan.id} className="rounded-lg border bg-white p-4 transition hover:shadow-md">
              <div className="mb-3 flex justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-800">{plan.title}</h3>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${actionPlanStatusBadge(plan.status)}`}>{plan.status.replace("_", " ")}</span>
                  </div>
                  <p className="text-sm text-gray-600">{plan.description || "No description"}</p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                    <span>By {plan.createdByName}</span>
                    <span>Start: {plan.startDate}</span>
                    <span>Completion: {plan.dueDate}</span>
                    <span>Created: {plan.createdAt}</span>
                  </div>
                </div>
                <div className="ml-0 flex shrink-0 flex-wrap gap-2">
                  <button type="button" onClick={() => setViewPlan(plan)} className="text-purple-600 hover:text-purple-700" title="View advanced plan">
                    <FileText className="size-4" />
                  </button>
                  <button type="button" onClick={() => setTaskModal({ plan })} className="text-green-600 hover:text-green-700" title="Create task">
                    <PlusCircle className="size-4" />
                  </button>
                  <button type="button" onClick={() => exportTasks(plan)} className="text-indigo-600 hover:text-indigo-700" title="Export tasks">
                    <FileUp className="size-4" />
                  </button>
                  <button type="button" onClick={() => setPlanModal(plan)} className="text-blue-500 hover:text-blue-700" title="Edit">
                    <Pencil className="size-4" />
                  </button>
                  <button type="button" onClick={() => removePlan(plan)} className="text-red-500 hover:text-red-700" title="Delete">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium text-gray-800">{plan.progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${Math.min(plan.progress, 100)}%` }} />
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                <div className="grid grid-cols-12 gap-2 border-b border-gray-100 bg-white px-4 py-3 text-xs font-semibold text-gray-600">
                  <div className="col-span-12 md:col-span-2">Activity</div>
                  <div className="col-span-12 md:col-span-2">Milestone</div>
                  <div className="col-span-6 md:col-span-2">Budget</div>
                  <div className="col-span-6 md:col-span-2">Deadline</div>
                  <div className="col-span-6 md:col-span-1">Priority</div>
                  <div className="col-span-6 md:col-span-1">Progress</div>
                  <div className="col-span-12 text-left md:col-span-2 md:text-right">Actions</div>
                </div>
                {plan.tasks.length ? plan.tasks.map((task) => (
                  <div key={task.id} className="grid grid-cols-12 items-center gap-2 border-b border-gray-100 px-4 py-3 text-sm last:border-b-0">
                    <div className="col-span-12 font-medium text-gray-800 md:col-span-2">{task.activity || task.taskName || "-"}</div>
                    <div className="col-span-12 text-gray-600 md:col-span-2">{task.targetMilestone || "-"}</div>
                    <div className="col-span-6 text-gray-600 md:col-span-2">{task.estimatedBudget ? formatCurrency(task.estimatedBudget) : "-"}</div>
                    <div className="col-span-6 text-gray-600 md:col-span-2">{task.deadline || "-"}</div>
                    <div className="col-span-6 md:col-span-1">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">{task.priority || "medium"}</span>
                    </div>
                    <div className="col-span-6 md:col-span-1">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-gray-500">{task.progress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(task.progress, 100)}%` }} />
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-2">
                      <div className="flex items-center justify-start gap-1 md:justify-end md:gap-2">
                        <button type="button" onClick={() => setTaskModal({ plan, task })} className="inline-flex size-7 items-center justify-center rounded-full text-blue-600 hover:bg-blue-50 md:size-8" title="Edit task">
                          <Pencil className="size-4" />
                        </button>
                        <button type="button" onClick={() => removeTask(task)} className="inline-flex size-7 items-center justify-center rounded-full text-red-600 hover:bg-red-50 md:size-8" title="Delete task">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="px-4 py-6 text-center text-sm text-gray-500">No tasks created yet. Use the green plus button to add one.</div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Total estimated amount</p>
                  <p className="text-sm text-gray-500">For this action plan only</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Budget</p>
                  <p className="text-lg font-bold text-gray-800">{formatCurrency(totalBudget)}</p>
                </div>
              </div>
            </article>
          );
        }) : (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
            <ClipboardList className="mx-auto mb-3 size-10 text-gray-300" />
            <p className="text-sm text-gray-500">No action plans found</p>
            <button type="button" onClick={() => setPlanModal("new")} className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700">Create your first action plan</button>
          </div>
        )}
      </div>

      {planModal && (
        <Modal title={editingPlan ? "Edit Action Plan" : "Create Action Plan"} onClose={closePlanModal} width="max-w-2xl">
          <form onSubmit={submitPlan} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Action Plan Name *</label>
              <input name="title" defaultValue={editingPlan?.title ?? ""} required placeholder="Enter action plan name" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Start Date *</label>
                <input name="startDate" type="date" defaultValue={editingPlan?.startDateRaw ?? ""} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Completion Date *</label>
                <input name="dueDate" type="date" defaultValue={editingPlan?.dueDateRaw ?? ""} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea name="description" rows={3} defaultValue={editingPlan?.description ?? ""} placeholder="Optional description" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <ModalFooter pending={pending} submitLabel={editingPlan ? "Update Action Plan" : "Create Action Plan"} onClose={closePlanModal} />
          </form>
        </Modal>
      )}

      {taskModal && (
        <Modal title={editingTask ? `Edit Task for ${taskModal.plan.title}` : `Create Task for ${taskModal.plan.title}`} onClose={closeTaskModal} width="max-w-2xl">
          <form onSubmit={submitTask} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Action Plan</label>
              <input value={taskModal.plan.title} readOnly className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Activity *</label>
              <input name="activity" defaultValue={editingTask?.activity ?? editingTask?.taskName ?? ""} required placeholder="Enter activity" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Targeted Milestone *</label>
              <input name="targetMilestone" defaultValue={editingTask?.targetMilestone ?? ""} required placeholder="Enter targeted milestone" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
                <input name="startDate" type="date" defaultValue={editingTask?.startDateRaw ?? ""} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Estimated Budget *</label>
                <input name="estimatedBudget" type="number" min="0" step="0.01" defaultValue={editingTask?.estimatedBudget ?? ""} required placeholder="0.00" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Deadline *</label>
                <input name="deadline" type="date" defaultValue={editingTask?.deadlineRaw ?? ""} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Priority *</label>
                <select name="priority" defaultValue={editingTask?.priority ?? "medium"} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                  <option value="">Select priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Progress *</label>
                <input name="progress" type="number" min="0" max="100" defaultValue={editingTask?.progress ?? 0} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
            <ModalFooter pending={pending} submitLabel={editingTask ? "Update Task" : "Save Task"} onClose={closeTaskModal} />
          </form>
        </Modal>
      )}

      {viewPlan && (
        <AdvancedActionPlanModal
          plan={viewPlan}
          departmentLabel="Financial Management"
          onClose={() => setViewPlan(null)}
          onExport={() => exportTasks(viewPlan)}
          onEdit={() => {
            setViewPlan(null);
            setPlanModal(viewPlan);
          }}
        />
      )}

      {confirmAction ? (
        <FinanceConfirmModal
          confirm={confirmAction}
          pending={pending}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => startTransition(confirmAction.action)}
        />
      ) : null}
    </div>
  );
}

function ActionSummaryCard({ label, value, tone }: { label: string; value: number; tone: "rose" | "amber" | "sky" }) {
  const colors = {
    rose: "border-rose-100 from-white via-rose-50 to-red-50/40 text-rose-600 bg-rose-100 ring-rose-200",
    amber: "border-amber-100 from-white via-amber-50 to-yellow-50/50 text-amber-600 bg-amber-100 ring-amber-200",
    sky: "border-sky-100 from-white via-sky-50 to-blue-50/40 text-sky-600 bg-sky-100 ring-sky-200",
  };
  const Icon = tone === "rose" ? AlertTriangle : tone === "amber" ? Hourglass : UserCheck;
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 shadow-sm ${colors[tone]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className={`flex size-10 items-center justify-center rounded-lg ring-1 ${colors[tone]}`}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function AdvancedActionPlanModal({
  plan,
  departmentLabel,
  onClose,
  onExport,
  onEdit,
}: {
  plan: ActionPlan;
  departmentLabel: string;
  onClose: () => void;
  onExport: () => void;
  onEdit: () => void;
}) {
  const months = buildTimelineMonths(plan);
  const minWidth = Math.max(780, months.length * 90 + 360);
  const totalBudget = plan.tasks.reduce((sum, task) => sum + task.estimatedBudget, 0);

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-gray-900/60">
      <div className="mx-auto w-full max-w-6xl px-3 pb-8 pt-6 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 pb-5 pt-8 sm:px-8">
            <div className="min-w-0">
              <div className="mb-5 h-1 w-28 rounded-full bg-gradient-to-r from-fuchsia-500 to-orange-400" />
              <h3 className="text-xl font-bold leading-none tracking-tight sm:text-2xl">
                <span className="text-gray-700">{departmentLabel}</span>
                <span className="text-purple-500"> ACTION PLAN</span>
              </h3>
              <p className="mt-4 text-sm text-gray-500 sm:text-base">{plan.title}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={onExport} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">
                <FileSpreadsheet className="size-4" />
                Export
              </button>
              <button type="button" onClick={onClose} className="mt-1 text-gray-400 hover:text-gray-600" aria-label="Close">
                <X className="size-6" />
              </button>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <PlanDetail label="Status" value={plan.status.replace("_", " ")} />
              <PlanDetail label="Progress" value={`${plan.progress}%`} />
              <PlanDetail label="Tasks" value={plan.tasks.length} />
              <PlanDetail label="Budget" value={formatCurrency(totalBudget)} />
            </div>
            {plan.description ? <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">{plan.description}</p> : null}

            <div className="overflow-x-auto rounded-3xl border border-gray-100 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
              <div style={{ minWidth }}>
                <div className="grid grid-cols-[180px_140px_140px_1fr] border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                  <div className="px-4 py-3">Activity</div>
                  <div className="px-4 py-3">Milestone</div>
                  <div className="px-4 py-3">Budget</div>
                  <div className="grid text-gray-700" style={{ gridTemplateColumns: `repeat(${months.length}, minmax(5.5rem, 1fr))` }}>
                    {months.map((month) => (
                      <div key={month.key} className="border-l border-gray-100 px-3 py-3 text-center">{month.label}</div>
                    ))}
                  </div>
                </div>

                {plan.tasks.length ? plan.tasks.map((task) => {
                  const position = taskTimelinePosition(task, months);
                  return (
                    <div key={task.id} className="grid grid-cols-[180px_140px_140px_1fr] border-b border-gray-100 text-sm last:border-b-0">
                      <div className="px-4 py-4">
                        <p className="font-semibold text-gray-800">{task.activity || task.taskName || "-"}</p>
                        <p className="mt-1 text-xs text-gray-500">Priority: {task.priority || "medium"}</p>
                      </div>
                      <div className="px-4 py-4 text-gray-600">{task.targetMilestone || "-"}</div>
                      <div className="px-4 py-4 text-gray-600">{task.estimatedBudget ? formatCurrency(task.estimatedBudget) : "-"}</div>
                      <div className="relative grid min-h-20" style={{ gridTemplateColumns: `repeat(${months.length}, minmax(5.5rem, 1fr))` }}>
                        {months.map((month) => (
                          <div key={month.key} className="border-l border-gray-100" />
                        ))}
                        <div className="absolute top-1/2 h-8 -translate-y-1/2 rounded-full bg-blue-600/90 px-3 text-xs font-semibold leading-8 text-white shadow-sm" style={{ left: `${position.left}%`, width: `${position.width}%` }}>
                          {task.progress}%
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-10 text-center text-sm text-gray-500">No tasks available.</div>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={onEdit} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50">Edit Plan</button>
              <button type="button" onClick={onClose} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildTimelineMonths(plan: ActionPlan) {
  const dates = [parseDate(plan.startDateRaw), parseDate(plan.dueDateRaw), ...plan.tasks.flatMap((task) => [parseDate(task.startDateRaw), parseDate(task.deadlineRaw)])].filter(Boolean) as Date[];
  const fallback = new Date();
  const min = dates.length ? new Date(Math.min(...dates.map((date) => date.getTime()))) : fallback;
  const max = dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : fallback;
  const cursor = new Date(min.getFullYear(), min.getMonth(), 1);
  const end = new Date(max.getFullYear(), max.getMonth(), 1);
  const months: Array<{ key: string; label: string; date: Date }> = [];
  while (cursor <= end || months.length === 0) {
    months.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      label: cursor.toLocaleString("en", { month: "short", year: "numeric" }),
      date: new Date(cursor),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function taskTimelinePosition(task: ActionPlanTask, months: Array<{ date: Date }>) {
  const start = parseDate(task.startDateRaw) ?? parseDate(task.deadlineRaw) ?? months[0]?.date ?? new Date();
  const deadline = parseDate(task.deadlineRaw) ?? start;
  const startIndex = monthDistance(months[0]?.date ?? start, start);
  const endIndex = monthDistance(months[0]?.date ?? start, deadline);
  const monthCount = Math.max(months.length, 1);
  const left = Math.max(0, Math.min(100, (Math.min(startIndex, endIndex) / monthCount) * 100));
  const span = Math.max(1, Math.abs(endIndex - startIndex) + 1);
  const width = Math.max(8, Math.min(100 - left, (span / monthCount) * 100));
  return { left, width };
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthDistance(from: Date, to: Date) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

function PlanDetail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold capitalize text-gray-800">{value}</p>
    </div>
  );
}

function actionPlanStatusBadge(status: string) {
  if (status === "completed") return "bg-green-100 text-green-700";
  if (status === "in_progress") return "bg-blue-100 text-blue-700";
  return "bg-yellow-100 text-yellow-700";
}

function FinanceNoticeBanner({ notice, onClose }: { notice: FinanceNotice; onClose: () => void }) {
  return <ActionNotice message={notice.message} tone={notice.ok ? "success" : "error"} onClose={onClose} />;
}

function FinanceConfirmModal({
  confirm,
  pending,
  onCancel,
  onConfirm,
}: {
  confirm: ConfirmAction;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const danger = confirm.tone !== "primary";

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className={`flex items-center gap-3 px-5 py-4 ${danger ? "bg-red-50" : "bg-blue-50"}`}>
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${danger ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
            {danger ? <AlertTriangle className="size-5" aria-hidden="true" /> : <CheckCircle2 className="size-5" aria-hidden="true" />}
          </span>
          <div>
            <h2 className="text-base font-bold text-gray-900">{confirm.title}</h2>
            <p className="text-xs text-gray-500">Financial Management DPT</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-gray-600">{confirm.message}</p>
        </div>
        <div className="flex justify-end gap-2 border-t bg-gray-50 px-5 py-4">
          <button type="button" onClick={onCancel} disabled={pending} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100 disabled:opacity-60">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={pending} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>
            {pending ? "Please wait..." : confirm.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function FinanceSettingsTab({ currentYear, settings }: { currentYear: number; settings: FinanceTermSetting[] }) {
  const settingsByYear = useMemo(
    () => new Map(settings.map((setting) => [setting.currentYear, setting])),
    [settings],
  );
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const initial = settingsByYear.get(currentYear);
  const [numberOfTerms, setNumberOfTerms] = useState(initial?.numberOfTerms ?? 3);
  const [percentages, setPercentages] = useState<number[]>(() => percentagesFromSetting(initial, 3));
  const [allowMemberCommitment, setAllowMemberCommitment] = useState(initial?.allowMemberCommitment ?? false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const total = percentages.reduce((sum, value) => sum + (Number(value) || 0), 0);
  const difference = 100 - total;
  const isBalanced = Math.abs(difference) <= 0.01;
  const isHistorical = selectedYear < currentYear;
  const years = useMemo(() => {
    const values = new Set<number>();
    for (let offset = -4; offset <= 4; offset += 1) values.add(currentYear + offset);
    settings.forEach((setting) => values.add(setting.currentYear));
    return Array.from(values).sort((a, b) => b - a);
  }, [currentYear, settings]);

  function loadYear(nextYear: number) {
    const nextSetting = settingsByYear.get(nextYear);
    const nextTerms = nextSetting?.numberOfTerms ?? 3;
    setSelectedYear(nextYear);
    setNumberOfTerms(nextTerms);
    setPercentages(percentagesFromSetting(nextSetting, nextTerms));
    setAllowMemberCommitment(nextSetting?.allowMemberCommitment ?? false);
    setResult(nextSetting ? null : { ok: true, message: `No existing settings for ${nextYear}. Using defaults.` });
  }

  function changeTerms(nextCount: number) {
    const bounded = Math.max(1, Math.min(12, nextCount));
    setNumberOfTerms(bounded);
    setPercentages((current) => {
      const next = current.slice(0, bounded);
      while (next.length < bounded) next.push(0);
      return next;
    });
  }

  function distributeEvenly() {
    const equal = Math.floor((100 / numberOfTerms) * 100) / 100;
    const next = Array.from({ length: numberOfTerms }, () => equal);
    const partial = next.reduce((sum, value) => sum + value, 0);
    next[next.length - 1] = Number((next[next.length - 1] + (100 - partial)).toFixed(2));
    setPercentages(next);
  }

  function updatePercentage(index: number, value: string) {
    const parsed = Math.max(0, Math.min(100, Number(value) || 0));
    setPercentages((current) => current.map((item, itemIndex) => (itemIndex === index ? parsed : item)));
  }

  function saveSettings() {
    const formData = new FormData();
    formData.set("current_year", String(selectedYear));
    formData.set("number_of_terms", String(numberOfTerms));
    formData.set("term_percentages", JSON.stringify(percentages));
    formData.set("term_numbers", JSON.stringify(Array.from({ length: numberOfTerms }, (_, index) => index + 1)));
    formData.set("allow_member_commitment", String(allowMemberCommitment));
    setResult(null);
    startTransition(async () => {
      setResult(await saveFinanceTermSettings(formData));
    });
  }

  return (
    <div className="mx-auto max-w-4xl py-2">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Contribution allocation per Term</h2>
        </div>
        <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50">
          <Settings className="size-5 text-blue-600" aria-hidden="true" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-end gap-5">
            <label className="space-y-1">
              <span className="block text-xs font-semibold uppercase text-gray-500">Select Year</span>
              <select
                value={selectedYear}
                onChange={(event) => loadYear(Number(event.target.value))}
                className="h-8 w-[130px] rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {years.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <div className="space-y-1">
              <span className="block text-xs font-semibold uppercase text-gray-500">Number of Terms</span>
              <div className="inline-flex h-8 items-center overflow-hidden rounded-lg border border-gray-300 bg-white">
                <button type="button" onClick={() => changeTerms(numberOfTerms - 1)} className="flex h-full w-8 items-center justify-center text-gray-500 hover:bg-gray-100" aria-label="Remove a term">
                  <Minus className="size-3" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={numberOfTerms}
                  onChange={(event) => changeTerms(Number(event.target.value))}
                  className="h-full w-12 border-x border-gray-300 text-center text-sm outline-none"
                />
                <button type="button" onClick={() => changeTerms(numberOfTerms + 1)} className="flex h-full w-8 items-center justify-center text-gray-500 hover:bg-gray-100" aria-label="Add a term">
                  <Plus className="size-3" />
                </button>
              </div>
            </div>

            <label className="ml-auto flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 transition hover:border-blue-200 hover:bg-blue-50/50">
              <span className="text-right">
                <span className="block text-xs font-semibold text-gray-800">Member commitments</span>

              </span>
              <input
                type="checkbox"
                role="switch"
                checked={allowMemberCommitment}
                onChange={(event) => setAllowMemberCommitment(event.target.checked)}
                className="peer sr-only"
              />
              <span className="relative h-6 w-11 shrink-0 rounded-full bg-gray-300 transition-colors peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-300 peer-focus-visible:ring-offset-2 after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" aria-hidden="true" />
            </label>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            {isHistorical ? `Viewing historical settings for ${selectedYear}` : `Viewing settings for ${selectedYear}`}
          </div>
          {isHistorical ? (
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Historical data. Changes saved separately.
            </div>
          ) : null}

          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-700">Term Distribution</h3>
              <button type="button" onClick={distributeEvenly} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-medium text-blue-700 transition hover:bg-blue-100">
                <Calculator className="size-4" aria-hidden="true" />
                Distribute Evenly
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {percentages.map((percentage, index) => (
              <div key={index} className="group rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-blue-300">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-gray-100 transition-colors group-hover:bg-blue-50">
                    <span className="text-xs font-semibold text-gray-700">{index + 1}</span>
                  </div>
                  <label className="min-w-0 flex-1">
                    <span className="mb-1 block text-xs font-medium text-gray-500">Term {index + 1} (%)</span>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={100}
                      value={percentage}
                      onChange={(event) => updatePercentage(index, event.target.value)}
                      className="h-8 w-full rounded-lg border border-gray-300 px-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total Allocation</span>
              <span className={`text-xl font-bold ${isBalanced ? "text-emerald-600" : difference < 0 ? "text-red-600" : "text-amber-600"}`}>{total.toFixed(2)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full transition-all duration-300 ${isBalanced ? "bg-emerald-500" : difference < 0 ? "bg-red-500" : "bg-amber-500"}`}
                style={{ width: `${Math.min(Math.max(total, 0), 100)}%` }}
              />
            </div>
            {!isBalanced ? (
              <p className={`mt-2 text-xs ${difference < 0 ? "text-red-600" : "text-amber-600"}`}>
                {difference < 0
                  ? `Reduce allocations by ${Math.abs(difference).toFixed(2)}% before saving.`
                  : `Allocate the remaining ${difference.toFixed(2)}% before saving.`}
              </p>
            ) : null}
          </div>

          {result ? (
            <FinanceNoticeBanner notice={result} onClose={() => setResult(null)} />
          ) : null}
        </div>

        <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-4 py-3">
          <button
            type="button"
            onClick={saveSettings}
            disabled={!isBalanced || pending}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="size-4" aria-hidden="true" />
            {pending ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

type ContributionRow = {
  user: UserOption;
  contribution: Contribution | undefined;
  annualAmount: number;
  familyName: string | null;
  termRows: Array<{ term: number; target: number; paid: number }>;
  totalPaid: number;
  progress: number;
};

type ContributionSortField = "member" | "progress" | `term-${number}`;

function FinanceContributionsTab({
  currentYear,
  users,
  families,
  contributions,
  payments,
  termSettings,
  fromDate,
  toDate,
  setFromDate,
  setToDate,
}: {
  currentYear: number;
  users: UserOption[];
  families: FamilyOption[];
  contributions: Contribution[];
  payments: Payment[];
  termSettings: FinanceTermSetting[];
  fromDate: string;
  toDate: string;
  setFromDate: (value: string) => void;
  setToDate: (value: string) => void;
}) {
  const router = useRouter();
  const [familyFilter, setFamilyFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [requestedPage, setRequestedPage] = useState(1);
  const [sortField, setSortField] = useState<ContributionSortField>("member");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [annualModalUser, setAnnualModalUser] = useState<UserOption | null>(null);
  const [paymentModalUser, setPaymentModalUser] = useState<UserOption | null>(null);
  const [annualModalOpen, setAnnualModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<ContributionRow | null>(null);
  const [detailTerm, setDetailTerm] = useState<number | null>(null);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedYear = Number(fromDate.slice(0, 4)) || currentYear;
  const selectedYearEnd = `${selectedYear}-12-31`;

  const yearFamilies = useMemo(
    () => families.filter((family) => family.year === selectedYear),
    [families, selectedYear],
  );
  const termSetting = termSettings.find((setting) => setting.currentYear === selectedYear);
  const termPercentages = percentagesFromSetting(termSetting, termSetting?.numberOfTerms ?? 3);
  const termNumbers = Array.from({ length: termPercentages.length }, (_, index) => index + 1);
  const contributionMap = useMemo(
    () => new Map(contributions.filter((item) => item.year === selectedYear).map((item) => [item.userId, item])),
    [contributions, selectedYear],
  );
  const paymentsForRange = useMemo(
    () => payments
      .filter((payment) => payment.year === selectedYear)
      .filter((payment) => payment.status !== "voided")
      .filter((payment) => !fromDate || payment.paymentDateRaw >= fromDate)
      .filter((payment) => !toDate || payment.paymentDateRaw <= toDate),
    [payments, selectedYear, fromDate, toDate],
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users
      .filter((user) => user.familyYear === selectedYear || !user.familyYear)
      .filter((user) => familyFilter === "all" || user.familyId === Number(familyFilter))
      .filter((user) => !query || user.name.toLowerCase().includes(query))
      .map((user) => {
        const contribution = contributionMap.get(user.id);
        const annualAmount = contribution?.annualAmount ?? 0;
        const userPayments = paymentsForRange.filter((payment) => payment.userId === user.id);
        const termRows = termNumbers.map((term, index) => {
          const paid = userPayments
            .filter((payment) => payment.term === term)
            .reduce((sum, payment) => sum + payment.amount, 0);
          return {
            term,
            target: (annualAmount * (termPercentages[index] ?? 0)) / 100,
            paid,
          };
        });
        const totalPaid = termRows.reduce((sum, row) => sum + row.paid, 0);
        const progress = calculateContributionRate(totalPaid, annualAmount);
        return {
          user,
          contribution,
          annualAmount,
          familyName: user.familyYear === selectedYear ? user.familyName : null,
          termRows,
          totalPaid,
          progress,
        };
      });
  }, [users, selectedYear, familyFilter, search, contributionMap, paymentsForRange, termNumbers, termPercentages]);

  const memberStats = useMemo(() => {
    const annualExpected = rows.reduce((sum, row) => sum + row.annualAmount, 0);
    const totalReceived = rows.reduce((sum, row) => sum + row.totalPaid, 0);
    const rangeStart = Date.parse(`${fromDate}T00:00:00.000Z`);
    const rangeEnd = Date.parse(`${toDate}T00:00:00.000Z`);
    const yearStart = Date.UTC(selectedYear, 0, 1);
    const nextYearStart = Date.UTC(selectedYear + 1, 0, 1);
    const clampedStart = Math.max(rangeStart, yearStart);
    const clampedEnd = Math.min(rangeEnd, nextYearStart - 1);
    const selectedDays = Number.isFinite(clampedStart) && Number.isFinite(clampedEnd) && clampedEnd >= clampedStart
      ? Math.floor((clampedEnd - clampedStart) / 86_400_000) + 1
      : 0;
    const daysInYear = Math.round((nextYearStart - yearStart) / 86_400_000);
    const totalExpected = Math.round(annualExpected * (selectedDays / daysInYear));
    const pendingAmount = Math.max(totalExpected - totalReceived, 0);
    const contributionRate = calculateContributionRate(totalReceived, totalExpected);

    return { totalExpected, totalReceived, pendingAmount, contributionRate };
  }, [rows, fromDate, toDate, selectedYear]);

  const sortedRows = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;
    return [...rows].sort((firstRow, secondRow) => {
      let comparison = 0;
      if (sortField === "member") comparison = firstRow.user.name.localeCompare(secondRow.user.name, undefined, { sensitivity: "base" });
      if (sortField === "progress") comparison = firstRow.progress - secondRow.progress;
      if (sortField.startsWith("term-")) {
        const termNumber = Number(sortField.slice(5));
        const firstPaid = firstRow.termRows.find((term) => term.term === termNumber)?.paid ?? 0;
        const secondPaid = secondRow.termRows.find((term) => term.term === termNumber)?.paid ?? 0;
        comparison = firstPaid - secondPaid;
      }
      return (comparison || firstRow.user.name.localeCompare(secondRow.user.name, undefined, { sensitivity: "base" })) * direction;
    });
  }, [rows, sortField, sortDirection]);

  const recordsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / recordsPerPage));
  const currentPage = Math.min(requestedPage, totalPages);
  const firstRecordIndex = (currentPage - 1) * recordsPerPage;
  const paginatedRows = sortedRows.slice(firstRecordIndex, firstRecordIndex + recordsPerPage);

  function changeContributionSort(field: ContributionSortField) {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "member" ? "asc" : "desc");
    }
    setRequestedPage(1);
  }

  function contributionSortIcon(field: ContributionSortField) {
    if (sortField !== field) return <ArrowUpDown className="size-3.5 text-gray-400" aria-hidden="true" />;
    return sortDirection === "asc" ? <ArrowUp className="size-3.5" aria-hidden="true" /> : <ArrowDown className="size-3.5" aria-hidden="true" />;
  }

  function submitAction(action: (formData: FormData) => Promise<{ ok: boolean; message: string }>, formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const response = await action(formData);
      setResult(response);
      if (response.ok) {
        setAnnualModalOpen(false);
        setPaymentModalOpen(false);
        setAnnualModalUser(null);
        setPaymentModalUser(null);
        router.refresh();
      }
    });
  }

  function submitPaymentEdit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const response = await updateFinancePayment(formData);
      setResult(response);
      if (response.ok) {
        setEditPayment(null);
        router.refresh();
      }
    });
  }

  function submitTermTotalEdit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const response = await updateTermContributionTotal(formData);
      setResult(response);
      if (response.ok) {
        setDetailRow(null);
        setDetailTerm(null);
        router.refresh();
      }
    });
  }

  function openTermPayments(row: ContributionRow, term: number) {
    setDetailTerm(term);
    setDetailRow(row);
  }

  function exportCsv() {
    const headers = ["Member", "Family", "Annual Target"];
    termNumbers.forEach((term) => {
      headers.push(`Term ${term} Target`, `Term ${term} Paid`);
    });
    headers.push("Total Paid", "Outstanding", "Progress");

    const lines = [
      headers,
      ...sortedRows.map((row) => [
        row.user.name,
        row.familyName ?? "",
        row.annualAmount,
        ...row.termRows.flatMap((term) => [term.target.toFixed(2), term.paid.toFixed(2)]),
        row.totalPaid.toFixed(2),
        Math.max(row.annualAmount - row.totalPaid, 0).toFixed(2),
        `${row.progress}%`,
      ]),
    ];

    const csv = lines.map((line) => line.map(csvCell).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contributions_${fromDate}_to_${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 2xl:flex-row 2xl:items-end 2xl:gap-2">
        <div className="min-w-0 flex-1 2xl:min-w-[650px]">
          <h2 className="text-base font-semibold text-gray-800">Member Contributions</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MemberContributionStat label="Expected Amount" value={formatCurrency(memberStats.totalExpected)} tone="blue" />
            <MemberContributionStat label="Total Received" value={formatCurrency(memberStats.totalReceived)} tone="green" />
            <MemberContributionStat label="Pending Amount" value={formatCurrency(memberStats.pendingAmount)} tone="amber" />
            <MemberContributionStat label="Contribution Rate" value={`${memberStats.contributionRate}%`} tone="purple" />
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end sm:justify-end 2xl:w-auto">
          <div className="grid grid-cols-2 gap-2">
            <FieldLabel label="From date">
              <input
                type="date"
                value={fromDate}
                onChange={(event) => {
                  const nextFromDate = event.target.value;
                  const nextYear = Number(nextFromDate.slice(0, 4)) || currentYear;
                  setFromDate(nextFromDate);
                  if (!toDate || toDate.slice(0, 4) !== String(nextYear) || toDate < nextFromDate) setToDate(`${nextYear}-12-31`);
                  setFamilyFilter("all");
                  setRequestedPage(1);
                }}
                className="h-8 w-full rounded-lg border border-gray-300 px-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-32"
              />
            </FieldLabel>
            <FieldLabel label="To date">
              <input
                type="date"
                value={toDate}
                min={fromDate}
                max={selectedYearEnd}
                onChange={(event) => {
                  setToDate(event.target.value);
                  setRequestedPage(1);
                }}
                className="h-8 w-full rounded-lg border border-gray-300 px-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-32"
              />
            </FieldLabel>
          </div>
          <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
            <button type="button" onClick={exportCsv} title="Export Excel" aria-label="Export Excel" className="inline-flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200">
              <FileSpreadsheet className="size-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => { setPaymentModalUser(null); setPaymentModalOpen(true); }} title="Record Payment" aria-label="Record Payment" className="inline-flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">
              <HandCoins className="size-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => { setAnnualModalUser(null); setAnnualModalOpen(true); }} title="Set Annual Contribution" aria-label="Set Annual Contribution" className="inline-flex size-9 items-center justify-center rounded-xl bg-green-600 text-white shadow-sm transition hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200">
              <PlusCircle className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex max-w-4xl flex-col gap-2 sm:flex-row">
        <label className="relative w-full sm:w-64">
          <Users className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <select
            value={familyFilter}
            onChange={(event) => {
              setFamilyFilter(event.target.value);
              setRequestedPage(1);
            }}
            className="h-8 w-full appearance-none rounded-lg border border-gray-300 bg-white px-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All Families</option>
            {yearFamilies.map((family) => (
              <option key={family.id} value={family.id}>{family.name}</option>
            ))}
          </select>
        </label>
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setRequestedPage(1);
            }}
            placeholder="Search by member name..."
            className="h-8 w-full rounded-lg border border-gray-300 px-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>
      <p className="text-xs text-gray-500">{rows.length} contribution records found</p>

      {result ? (
        <FinanceNoticeBanner notice={result} onClose={() => setResult(null)} />
      ) : null}

      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th aria-sort={sortField === "member" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"} className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                <button type="button" onClick={() => changeContributionSort("member")} title="Sort by Member" className={`inline-flex items-center gap-1 transition hover:text-blue-600 ${sortField === "member" ? "text-blue-600" : "text-gray-500"}`}>
                  Member
                  {contributionSortIcon("member")}
                </button>
              </th>
              {termNumbers.map((term, index) => {
                const field: ContributionSortField = `term-${term}`;
                return (
                  <th key={term} aria-sort={sortField === field ? (sortDirection === "asc" ? "ascending" : "descending") : "none"} className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    <button type="button" onClick={() => changeContributionSort(field)} title={`Sort by Term ${term} paid amount`} className={`inline-flex items-center gap-1 transition hover:text-blue-600 ${sortField === field ? "text-blue-600" : "text-gray-500"}`}>
                      <span>Term {term} <span className="font-normal">({termPercentages[index]?.toFixed(0)}%)</span></span>
                      {contributionSortIcon(field)}
                    </button>
                  </th>
                );
              })}
              <th aria-sort={sortField === "progress" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"} className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                <button type="button" onClick={() => changeContributionSort("progress")} title="Sort by Total Progress" className={`inline-flex items-center gap-1 transition hover:text-blue-600 ${sortField === "progress" ? "text-blue-600" : "text-gray-500"}`}>
                  Total Progress
                  {contributionSortIcon("progress")}
                </button>
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.length ? paginatedRows.map((row) => (
              <tr key={row.user.id}>
                <td className="min-w-56 px-3 py-3">
                  <p className="font-medium text-gray-800">{row.user.name}</p>
                  <p className={`mt-1 text-xs text-gray-400 ${row.familyName ? "" : "italic"}`}>{row.familyName ?? `No Family in ${selectedYear}`}</p>
                </td>
                {row.termRows.map((term) => (
                  <td key={term.term} className="min-w-[120px] px-3 py-2">
                    <TermContributionProgress
                      paid={term.paid}
                      target={term.target}
                      label={`Term ${term.term}`}
                      onEdit={term.paid > 0 ? () => openTermPayments(row, term.term) : undefined}
                    />
                  </td>
                ))}
                <td className="min-w-[150px] px-3 py-2">
                  <TotalContributionProgress paid={row.totalPaid} annualAmount={row.annualAmount} progress={row.progress} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-1">
                    <ContributionActionButton label="Edit annual amount" onClick={() => { setAnnualModalUser(row.user); setAnnualModalOpen(true); }} icon={Pencil} tone="blue" />
                    <ContributionActionButton label="Record payment" onClick={() => { setPaymentModalUser(row.user); setPaymentModalOpen(true); }} icon={HandCoins} tone="green" />
                    <ContributionActionButton label="View and edit payment history" onClick={() => { setDetailTerm(null); setDetailRow(row); }} icon={FileSpreadsheet} tone="amber" />
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={termNumbers.length + 3} className="px-4 py-10 text-center text-gray-400">No contribution records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rows.length > recordsPerPage ? (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-3 sm:flex-row">
          <p className="text-xs text-gray-500">
            Showing {firstRecordIndex + 1}–{Math.min(firstRecordIndex + recordsPerPage, rows.length)} of {rows.length} records
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setRequestedPage(currentPage - 1)}
              className="h-8 rounded-lg border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="min-w-20 text-center text-xs font-medium text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setRequestedPage(currentPage + 1)}
              className="h-8 rounded-lg border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2 sm:hidden">
        {rows.length ? paginatedRows.map((row) => (
          <article key={row.user.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="bg-gray-50 px-3 py-2">
              <p className="font-medium text-gray-800">{row.user.name}</p>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className={row.familyName ? "" : "italic"}>{row.familyName ?? `No Family in ${selectedYear}`}</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {row.termRows.map((term) => (
                <div key={term.term} className="grid grid-cols-[80px_1fr] items-center gap-2 px-3 py-2">
                  <span className="text-[11px] font-semibold uppercase text-gray-500">Term {term.term}</span>
                  <TermContributionProgress
                    paid={term.paid}
                    target={term.target}
                    label={`Term ${term.term}`}
                    onEdit={term.paid > 0 ? () => openTermPayments(row, term.term) : undefined}
                  />
                </div>
              ))}
              <div className="grid grid-cols-[80px_1fr] items-center gap-2 px-3 py-2">
                <span className="text-[11px] font-semibold uppercase text-gray-500">Progress</span>
                <TotalContributionProgress paid={row.totalPaid} annualAmount={row.annualAmount} progress={row.progress} />
              </div>
              <div className="grid grid-cols-[80px_1fr] items-center gap-2 px-3 py-2">
                <span className="text-[11px] font-semibold uppercase text-gray-500">Actions</span>
                <div className="flex flex-wrap gap-1">
                  <ContributionActionButton label="Edit annual amount" onClick={() => { setAnnualModalUser(row.user); setAnnualModalOpen(true); }} icon={Pencil} tone="blue" />
                  <ContributionActionButton label="Record payment" onClick={() => { setPaymentModalUser(row.user); setPaymentModalOpen(true); }} icon={HandCoins} tone="green" />
                  <ContributionActionButton label="View and edit payment history" onClick={() => { setDetailTerm(null); setDetailRow(row); }} icon={FileSpreadsheet} tone="amber" />
                </div>
              </div>
            </div>
          </article>
        )) : (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center text-gray-400">No contribution records found</div>
        )}
      </div>

      {annualModalOpen ? (
        <AnnualContributionModal
          user={annualModalUser}
          users={users}
          year={selectedYear}
          contribution={annualModalUser ? contributionMap.get(annualModalUser.id) : undefined}
          pending={pending}
          onUserChange={setAnnualModalUser}
          onClose={() => { setAnnualModalOpen(false); setAnnualModalUser(null); }}
          onSubmit={(formData) => submitAction(saveAnnualContribution, formData)}
        />
      ) : null}

      {paymentModalOpen ? (
        <PaymentModal
          user={paymentModalUser}
          users={users}
          year={selectedYear}
          defaultDate={fromDate <= new Date().toISOString().slice(0, 10) && new Date().toISOString().slice(0, 10) <= toDate ? new Date().toISOString().slice(0, 10) : fromDate}
          termNumbers={termNumbers}
          pending={pending}
          onUserChange={setPaymentModalUser}
          onClose={() => { setPaymentModalOpen(false); setPaymentModalUser(null); }}
          onSubmit={(formData) => submitAction(recordContributionPayment, formData)}
        />
      ) : null}

      {detailRow ? (
        <DetailsModal
          row={detailRow}
          payments={paymentsForRange.filter((payment) => payment.userId === detailRow.user.id)}
          term={detailTerm}
          year={selectedYear}
          pending={pending}
          onUpdateTermTotal={submitTermTotalEdit}
          onEditPayment={(payment) => { setDetailRow(null); setDetailTerm(null); setEditPayment(payment); }}
          onClose={() => { setDetailRow(null); setDetailTerm(null); }}
        />
      ) : null}

      {editPayment ? (
        <EditPaymentModal
          payment={editPayment}
          users={users}
          termNumbers={termNumbers}
          pending={pending}
          onClose={() => setEditPayment(null)}
          onSubmit={submitPaymentEdit}
        />
      ) : null}
    </div>
  );
}

function FinancePaymentsTab({
  currentYear,
  payments,
  users,
  termSettings,
  fromDate,
  toDate,
  setFromDate,
  setToDate,
}: {
  currentYear: number;
  payments: Payment[];
  users: UserOption[];
  termSettings: FinanceTermSetting[];
  fromDate: string;
  toDate: string;
  setFromDate: (value: string) => void;
  setToDate: (value: string) => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [requestedPage, setRequestedPage] = useState(1);
  const [sortField, setSortField] = useState<"date" | "member" | "term" | "amount" | "method">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [pending, startTransition] = useTransition();
  const numberOfTerms = termSettings.find((setting) => setting.currentYear === currentYear)?.numberOfTerms ?? 3;
  const termNumbers = Array.from({ length: numberOfTerms }, (_, index) => index + 1);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();
    const direction = sortDirection === "asc" ? 1 : -1;
    return payments
      .filter((payment) => payment.status !== "voided")
      .filter((payment) => !fromDate || payment.paymentDateRaw >= fromDate)
      .filter((payment) => !toDate || payment.paymentDateRaw <= toDate)
      .filter((payment) => !query || payment.userName.toLowerCase().includes(query))
      .sort((firstPayment, secondPayment) => {
        let comparison = 0;
        if (sortField === "date") comparison = firstPayment.paymentDateRaw.localeCompare(secondPayment.paymentDateRaw) || firstPayment.createdAt.localeCompare(secondPayment.createdAt);
        if (sortField === "member") comparison = firstPayment.userName.localeCompare(secondPayment.userName, undefined, { sensitivity: "base" });
        if (sortField === "term") comparison = (firstPayment.term ?? 0) - (secondPayment.term ?? 0);
        if (sortField === "amount") comparison = firstPayment.amount - secondPayment.amount;
        if (sortField === "method") comparison = methodLabel(firstPayment.paymentMethod).localeCompare(methodLabel(secondPayment.paymentMethod), undefined, { sensitivity: "base" });
        return (comparison || firstPayment.id - secondPayment.id) * direction;
      });
  }, [payments, fromDate, toDate, search, sortField, sortDirection]);

  const recordsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / recordsPerPage));
  const currentPage = Math.min(requestedPage, totalPages);
  const firstRecordIndex = (currentPage - 1) * recordsPerPage;
  const paginatedPayments = filteredPayments.slice(firstRecordIndex, firstRecordIndex + recordsPerPage);

  const totalPayments = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);

  function changeSort(field: "date" | "member" | "term" | "amount" | "method") {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "date" ? "desc" : "asc");
    }
    setRequestedPage(1);
  }

  function exportCsv() {
    if (fromDate && toDate && fromDate > toDate) {
      setResult({ ok: false, message: "To date must be on or after from date." });
      return;
    }

    const lines = [
      ["Date", "Member", "Term", "Amount (RWF)", "Payment Method", "Status", "Notes"],
      ...filteredPayments.map((payment) => [
        payment.paymentDateRaw,
        payment.userName,
        payment.term ? `Term ${payment.term}` : "",
        payment.amount,
        methodLabel(payment.paymentMethod),
        payment.status,
        payment.notes ?? "",
      ]),
    ];
    const csv = lines.map((line) => line.map(csvCell).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payments_${fromDate || "all"}_to_${toDate || "all"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function submitEdit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const response = await updateFinancePayment(formData);
      setResult(response);
      if (response.ok) {
        setEditPayment(null);
        router.refresh();
      }
    });
  }

  function deletePayment(payment: Payment) {
    setConfirmAction({
      title: "Void Payment",
      message: `Void payment for ${payment.userName} (${formatCurrency(payment.amount)})? The record remains in the audit history.`,
      confirmLabel: "Void Payment",
      action: async () => {
        setResult(null);
        const response = await deleteFinancePayment(payment.id);
        setResult(response);
        if (response.ok) {
          setConfirmAction(null);
          router.refresh();
        }
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end sm:gap-3">
          <FieldLabel label="From">
            <input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setRequestedPage(1); }} className="h-9 w-full rounded-lg border border-gray-300 px-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-8" />
          </FieldLabel>
          <FieldLabel label="To">
            <input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setRequestedPage(1); }} className="h-9 w-full rounded-lg border border-gray-300 px-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-8" />
          </FieldLabel>
          <label className="relative col-span-2 sm:col-auto">
            <span className="mb-1 block text-xs font-medium text-gray-600">Search Member</span>
            <Search className="absolute left-3 top-[34px] size-4 text-gray-400 sm:top-[31px]" aria-hidden="true" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setRequestedPage(1); }} placeholder="Search by member name..." className="h-9 w-full rounded-lg border border-gray-300 px-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-8 sm:w-72" />
          </label>
          <button type="button" onClick={exportCsv} className="col-span-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 text-xs font-medium text-white transition hover:bg-green-700 sm:h-8 sm:w-auto">
            <FileSpreadsheet className="size-4" aria-hidden="true" />
            Export Excel
          </button>
        </div>
      </div>

      <div className="grid max-w-2xl grid-cols-2 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Total Payments</p>
              <p className="text-lg font-bold text-gray-800">{formatCurrency(totalPayments)}</p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50">
              <ChartPie className="size-4 text-blue-600" aria-hidden="true" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Total Transactions</p>
              <p className="text-lg font-bold text-gray-800">{filteredPayments.length}</p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg bg-green-50">
              <Receipt className="size-4 text-green-600" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      {result ? (
        <FinanceNoticeBanner notice={result} onClose={() => setResult(null)} />
      ) : null}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">#</th>
                {([
                  ["date", "Date"],
                  ["member", "Member"],
                  ["term", "Term"],
                  ["amount", "Amount"],
                  ["method", "Method"],
                ] as const).map(([field, label]) => (
                  <th key={field} aria-sort={sortField === field ? (sortDirection === "asc" ? "ascending" : "descending") : "none"} className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    <button type="button" onClick={() => changeSort(field)} title={`Sort by ${label}`} className={`inline-flex items-center gap-1 transition hover:text-blue-600 ${sortField === field ? "text-blue-600" : "text-gray-500"}`}>
                      {label}
                      {sortField === field ? (sortDirection === "asc" ? <ArrowUp className="size-3.5" aria-hidden="true" /> : <ArrowDown className="size-3.5" aria-hidden="true" />) : <ArrowUpDown className="size-3.5 text-gray-400" aria-hidden="true" />}
                    </button>
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Notes</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayments.length ? paginatedPayments.map((payment, index) => (
                <tr key={payment.id} className="transition hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-400">{firstRecordIndex + index + 1}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">{payment.paymentDate}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-800">{payment.userName}</p>
                    <p className="text-xs text-gray-500">Year {payment.year}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">Term {payment.term ?? "-"}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-green-600">{formatCurrency(payment.amount)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${methodBadge(payment.paymentMethod)}`}>
                      {methodLabel(payment.paymentMethod)}
                    </span>
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-2 text-xs text-gray-500">{payment.notes || "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <IconButton label="View Details" icon={FileSearch2} onClick={() => setDetailPayment(payment)} />
                      <IconButton label="Edit Payment" icon={Pencil} onClick={() => setEditPayment(payment)} />
                      <IconButton label="Delete Payment" icon={Trash2} onClick={() => deletePayment(payment)} danger />
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-500">No payment records found for this date range</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredPayments.length > recordsPerPage ? (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-3 sm:flex-row">
          <p className="text-xs text-gray-500">
            Showing {firstRecordIndex + 1}–{Math.min(firstRecordIndex + recordsPerPage, filteredPayments.length)} of {filteredPayments.length} records
          </p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={currentPage === 1} onClick={() => setRequestedPage(currentPage - 1)} className="h-8 rounded-lg border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
              Previous
            </button>
            <span className="min-w-20 text-center text-xs font-medium text-gray-600">Page {currentPage} of {totalPages}</span>
            <button type="button" disabled={currentPage === totalPages} onClick={() => setRequestedPage(currentPage + 1)} className="h-8 rounded-lg border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      ) : null}

      {detailPayment ? (
        <PaymentDetailsModal payment={detailPayment} onClose={() => setDetailPayment(null)} />
      ) : null}
      {editPayment ? (
        <EditPaymentModal
          payment={editPayment}
          users={users}
          termNumbers={termNumbers}
          pending={pending}
          onClose={() => setEditPayment(null)}
          onSubmit={submitEdit}
        />
      ) : null}
      {confirmAction ? (
        <FinanceConfirmModal
          confirm={confirmAction}
          pending={pending}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => startTransition(confirmAction.action)}
        />
      ) : null}
    </div>
  );
}

function FinanceExpensesTab({
  currentYear,
  currentUserId,
  accountBalance,
  expenses,
  users,
  permissions,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: {
  currentYear: number;
  currentUserId: number;
  accountBalance: number;
  expenses: Expense[];
  users: UserOption[];
  permissions: FinancePermissions;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}) {
  const router = useRouter();
  const { prompt } = useAppDialog();
  const [statusFilter, setStatusFilter] = useState("all");
  const [approverFilter, setApproverFilter] = useState("all");
  const [requestedPage, setRequestedPage] = useState(1);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [pending, startTransition] = useTransition();

  const dateRangeExpenses = useMemo(() => {
    return expenses
      .filter((expense) => !startDate || expense.dateRaw >= startDate)
      .filter((expense) => !endDate || expense.dateRaw <= endDate);
  }, [expenses, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return dateRangeExpenses
      .filter((expense) => statusFilter === "all" || expense.status === statusFilter)
      .filter((expense) => approverFilter === "all" || expense.approverId1 === Number(approverFilter) || expense.approverId2 === Number(approverFilter))
      .sort((a, b) => b.dateRaw.localeCompare(a.dateRaw) || b.id - a.id);
  }, [dateRangeExpenses, statusFilter, approverFilter]);

  const recordsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / recordsPerPage));
  const currentPage = Math.min(requestedPage, totalPages);
  const firstRecordIndex = (currentPage - 1) * recordsPerPage;
  const paginatedExpenses = filteredExpenses.slice(firstRecordIndex, firstRecordIndex + recordsPerPage);

  const approvers = useMemo(() => {
    const map = new Map<number, string>();
    expenses.forEach((expense) => {
      if (expense.approverId1 && expense.approver1Name) map.set(expense.approverId1, expense.approver1Name);
      if (expense.approverId2 && expense.approver2Name) map.set(expense.approverId2, expense.approver2Name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [expenses]);

  const stats = {
    total: dateRangeExpenses.filter((expense) => ["pending", "approved", "void_pending"].includes(expense.status)).reduce((sum, expense) => sum + expense.amount, 0),
    pending: dateRangeExpenses.filter((expense) => expense.status === "pending").reduce((sum, expense) => sum + expense.amount, 0),
    approved: dateRangeExpenses.filter((expense) => expense.status === "approved" || expense.status === "void_pending").reduce((sum, expense) => sum + expense.amount, 0),
  };

  function resetFilters() {
    onStartDateChange(`${currentYear}-01-01`);
    onEndDateChange(`${currentYear}-12-31`);
    setStatusFilter("all");
    setApproverFilter("all");
    setRequestedPage(1);
  }

  function submitExpense(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const response = await saveExpense(formData);
      setResult(response);
      if (response.ok) {
        setExpenseModalOpen(false);
        router.refresh();
      }
    });
  }

  function approveRow(expense: Expense) {
    const approvingVoid = expense.status === "void_pending";
    setConfirmAction({
      title: approvingVoid ? "Approve Expense Void" : "Approve Expense",
      message: approvingVoid ? `Approve voiding this previously approved expense for ${formatCurrency(expense.amount)}?` : `Approve this expense for ${formatCurrency(expense.amount)}?`,
      confirmLabel: approvingVoid ? "Approve Void" : "Approve",
      tone: "primary",
      action: async () => {
        setResult(null);
        const response = await approveExpense(expense.id);
        setResult(response);
        if (response.ok) {
          setConfirmAction(null);
          router.refresh();
        }
      },
    });
  }

  async function rejectRow(expense: Expense) {
    const rejectingVoid = expense.status === "void_pending";
    const reason = await prompt({ title: rejectingVoid ? "Reject Expense Void" : "Reject Expense", message: rejectingVoid ? `Keep this approved expense of ${formatCurrency(expense.amount)} and reject its void request?` : `Reject this expense for ${formatCurrency(expense.amount)}?`, inputLabel: "Rejection reason", inputPlaceholder: "Explain why this request is being rejected", confirmLabel: rejectingVoid ? "Reject Void" : "Reject Expense", tone: "danger", required: true });
    if (!reason) return;
    startTransition(async () => {
      const response = await rejectExpense(expense.id, reason);
      setResult(response);
      if (response.ok) router.refresh();
    });
  }

  async function deleteRow(expense: Expense) {
    const reason = await prompt({ title: "Void Expense", message: expense.status === "approved" ? "The original approver must approve this void request. The money remains deducted until then." : "The record will remain in the audit history.", inputLabel: "Reason for voiding", inputPlaceholder: "Explain why this expense is being voided", confirmLabel: expense.status === "approved" ? "Request Void" : "Void Expense", tone: "danger", required: true });
    if (!reason) return;
    startTransition(async () => {
      const response = await voidExpense(expense.id, reason);
      setResult(response);
      if (response.ok) router.refresh();
    });
  }

  function exportCsv() {
    if (startDate && endDate && startDate > endDate) {
      setResult({ ok: false, message: "To date must be on or after from date." });
      return;
    }
    const lines = [
      ["Date", "Reason", "Amount", "Status", "Approver", "Recorded By"],
      ...filteredExpenses.map((expense) => [
        expense.dateRaw,
        expense.description ?? "",
        expense.amount,
        expense.status,
        expense.approver1Name ?? expense.approver2Name ?? "",
        expense.createdByName,
      ]),
    ];
    const csv = lines.map((line) => line.map(csvCell).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expenses_${startDate}_to_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <h2 className="text-base font-semibold text-gray-800">Expenses</h2>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-wrap sm:items-end">
          <FieldLabel label="From">
            <input type="date" value={startDate} onChange={(event) => { onStartDateChange(event.target.value); setRequestedPage(1); }} className="h-9 w-full rounded-lg border border-gray-300 px-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-8" />
          </FieldLabel>
          <FieldLabel label="To">
            <input type="date" value={endDate} onChange={(event) => { onEndDateChange(event.target.value); setRequestedPage(1); }} className="h-9 w-full rounded-lg border border-gray-300 px-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-8" />
          </FieldLabel>
          {permissions.export ? <button type="button" onClick={exportCsv} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 text-xs text-white transition hover:bg-green-700 sm:h-8">
            <FileSpreadsheet className="size-4" />
            Export Excel
          </button> : null}
          {permissions.manageExpenses ? <button
            type="button"
            onClick={() => setExpenseModalOpen(true)}
            disabled={accountBalance <= 0}
            title={accountBalance <= 0 ? "No account balance is available for a new expense" : "Record a new expense"}
            className="col-span-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:col-auto sm:h-8"
          >
            <PlusCircle className="size-4" />
            New Expense
          </button> : null}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(340px,1.4fr)]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ExpenseStat label="Total" value={stats.total} tone="blue" icon={ChartPie} />
          <ExpenseStat label="Pending" value={stats.pending} tone="yellow" icon={CreditCard} />
          <ExpenseStat label="Approved" value={stats.approved} tone="green" icon={Save} />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <FieldLabel label="Status">
              <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setRequestedPage(1); }} className="h-8 w-full rounded-lg border border-gray-300 px-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="void_pending">Void Pending</option>
                <option value="voided">Voided</option>
              </select>
            </FieldLabel>
            <FieldLabel label="Approver">
              <select value={approverFilter} onChange={(event) => { setApproverFilter(event.target.value); setRequestedPage(1); }} className="h-8 w-full rounded-lg border border-gray-300 px-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                <option value="all">All Approvers</option>
                {approvers.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </FieldLabel>
          </div>
          <div className="mt-2 flex justify-end">
            <button type="button" onClick={resetFilters} className="text-xs text-gray-500 transition hover:text-gray-700">Reset</button>
          </div>
        </div>
      </div>

      {result ? (
        <FinanceNoticeBanner notice={result} onClose={() => setResult(null)} />
      ) : null}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["#", "Date", "Reason", "Amount", "Status", "Approver", "Actions"].map((header) => (
                  <th key={header} className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.length ? paginatedExpenses.map((expense, index) => (
                <tr key={expense.id} className="transition hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-400">{firstRecordIndex + index + 1}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">{expense.date}</td>
                  <td className="max-w-xs px-3 py-2 text-gray-800">{expense.description || "-"}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-blue-600">{formatCurrency(expense.amount)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${expenseStatusBadge(expense.status)}`}>{expenseStatusLabel(expense.status)}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">{expense.approver1Name ?? expense.approver2Name ?? "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <ExpenseActionButton label="View" icon={FileText} tone="blue" onClick={() => setDetailExpense(expense)} />
                      {(expense.status === "pending" || expense.status === "void_pending") && expense.approverId1 === currentUserId ? (
                        <ExpenseActionButton label={expense.status === "void_pending" ? "Approve Void" : "Approve"} icon={CheckCircle2} tone="green" onClick={() => approveRow(expense)} />
                      ) : null}
                      {(expense.status === "pending" || expense.status === "void_pending") && expense.approverId1 === currentUserId ? (
                        <ExpenseActionButton label={expense.status === "void_pending" ? "Reject Void" : "Reject"} icon={X} tone="red" onClick={() => rejectRow(expense)} />
                      ) : null}
                      {permissions.deleteExpenses && expense.status !== "voided" && expense.status !== "void_pending" ? <ExpenseActionButton label="Void" icon={Trash2} tone="red" onClick={() => deleteRow(expense)} /> : null}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">No expenses for this date range</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 p-3 sm:hidden">
          {filteredExpenses.length ? paginatedExpenses.map((expense, index) => {
            const approverName = expense.approver1Name ?? expense.approver2Name ?? "-";
            return (
              <div key={expense.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                <div className="mb-3 rounded-lg bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-400">#{firstRecordIndex + index + 1}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${expenseStatusBadge(expense.status)}`}>{expenseStatusLabel(expense.status)}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-800">{expense.description || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="font-medium uppercase tracking-wide text-gray-400">Date</p>
                    <p className="mt-0.5 text-gray-700">{expense.date}</p>
                  </div>
                  <div>
                    <p className="font-medium uppercase tracking-wide text-gray-400">Amount</p>
                    <p className="mt-0.5 font-semibold text-blue-600">{formatCurrency(expense.amount)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="font-medium uppercase tracking-wide text-gray-400">Approver</p>
                    <p className="mt-0.5 text-gray-700">{approverName}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 border-t border-gray-100 pt-2">
                  <ExpenseActionButton label="View" icon={FileText} tone="blue" onClick={() => setDetailExpense(expense)} />
                  {(expense.status === "pending" || expense.status === "void_pending") && expense.approverId1 === currentUserId ? (
                    <ExpenseActionButton label={expense.status === "void_pending" ? "Approve Void" : "Approve"} icon={CheckCircle2} tone="green" onClick={() => approveRow(expense)} />
                  ) : null}
                  {(expense.status === "pending" || expense.status === "void_pending") && expense.approverId1 === currentUserId ? (
                    <ExpenseActionButton label={expense.status === "void_pending" ? "Reject Void" : "Reject"} icon={X} tone="red" onClick={() => rejectRow(expense)} />
                  ) : null}
                  {permissions.deleteExpenses && expense.status !== "voided" && expense.status !== "void_pending" ? <ExpenseActionButton label="Void" icon={Trash2} tone="red" onClick={() => deleteRow(expense)} /> : null}
                </div>
              </div>
            );
          }) : (
            <div className="py-8 text-center text-sm text-gray-500">No expenses for this date range</div>
          )}
        </div>
      </div>

      {filteredExpenses.length > recordsPerPage ? (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-3 sm:flex-row">
          <p className="text-xs text-gray-500">
            Showing {firstRecordIndex + 1}–{Math.min(firstRecordIndex + recordsPerPage, filteredExpenses.length)} of {filteredExpenses.length} records
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setRequestedPage(currentPage - 1)}
              className="h-8 rounded-lg border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="min-w-20 text-center text-xs font-medium text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setRequestedPage(currentPage + 1)}
              className="h-8 rounded-lg border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {expenseModalOpen ? (
        <ExpenseModal
          currentYear={currentYear}
          availableBalance={accountBalance}
          users={users.filter((user) => user.id !== currentUserId && user.canApproveExpenses)}
          pending={pending}
          onClose={() => setExpenseModalOpen(false)}
          onSubmit={submitExpense}
        />
      ) : null}
      {detailExpense ? (
        <ExpenseDetailsModal expense={detailExpense} onClose={() => setDetailExpense(null)} />
      ) : null}
      {confirmAction ? (
        <FinanceConfirmModal
          confirm={confirmAction}
          pending={pending}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => startTransition(confirmAction.action)}
        />
      ) : null}
    </div>
  );
}

function FinanceSponsorsTab({ currentYear, sponsors, fromDate, toDate, setFromDate, setToDate }: { currentYear: number; sponsors: Sponsor[]; fromDate: string; toDate: string; setFromDate: (value: string) => void; setToDate: (value: string) => void }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [requestedPage, setRequestedPage] = useState(1);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | "new" | null>(null);
  const [paymentSponsor, setPaymentSponsor] = useState<Sponsor | null>(null);
  const [historySponsor, setHistorySponsor] = useState<Sponsor | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [pending, startTransition] = useTransition();
  const fromYear = Number(fromDate.slice(0, 4));
  const toYear = Number(toDate.slice(0, 4));

  const filteredSponsors = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sponsors
      .map((sponsor) => {
        const rangePayments = sponsor.payments.filter((payment) => {
          if (fromDate && payment.paymentDateRaw < fromDate) return false;
          if (toDate && payment.paymentDateRaw > toDate) return false;
          return true;
        });
        return {
          ...sponsor,
          rangeReceived: rangePayments.reduce((sum, payment) => sum + payment.amount, 0),
          rangePayments,
        };
      })
      .filter((sponsor) => (sponsor.year >= fromYear && sponsor.year <= toYear) || sponsor.rangePayments.length > 0)
      .filter((sponsor) => !query || sponsor.name.toLowerCase().includes(query) || (sponsor.phone ?? "").toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sponsors, fromDate, toDate, fromYear, toYear, search]);

  const recordsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredSponsors.length / recordsPerPage));
  const currentPage = Math.min(requestedPage, totalPages);
  const firstRecordIndex = (currentPage - 1) * recordsPerPage;
  const paginatedSponsors = filteredSponsors.slice(firstRecordIndex, firstRecordIndex + recordsPerPage);

  const stats = {
    totalSponsors: filteredSponsors.length,
    totalReceived: filteredSponsors.reduce((sum, sponsor) => sum + sponsor.rangeReceived, 0),
    totalCommitments: filteredSponsors.reduce((sum, sponsor) => sum + sponsor.commitmentAmount, 0),
  };

  function submitSponsor(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const response = await saveSponsor(formData);
      setResult(response);
      if (response.ok) {
        setEditingSponsor(null);
        router.refresh();
      }
    });
  }

  function submitSponsorPayment(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const response = await recordSponsorPayment(formData);
      setResult(response);
      if (response.ok) {
        setPaymentSponsor(null);
        router.refresh();
      }
    });
  }

  function removeSponsor(sponsor: Sponsor) {
    setConfirmAction({
      title: "Deactivate Sponsor",
      message: `Deactivate "${sponsor.name}"? Its payment history will be preserved.`,
      confirmLabel: "Deactivate Sponsor",
      action: async () => {
        setResult(null);
        const response = await deactivateSponsor(sponsor.id);
        setResult(response);
        if (response.ok) {
          setConfirmAction(null);
          router.refresh();
        }
      },
    });
  }

  function restoreSponsor(sponsor: Sponsor) {
    setConfirmAction({
      title: "Reactivate Sponsor",
      message: `Reactivate "${sponsor.name}"? They will be able to make new payments again.`,
      confirmLabel: "Reactivate Sponsor",
      tone: "primary",
      action: async () => {
        setResult(null);
        const response = await reactivateSponsor(sponsor.id);
        setResult(response);
        if (response.ok) {
          setConfirmAction(null);
          router.refresh();
        }
      },
    });
  }

  function exportCsv() {
    if (fromDate && toDate && fromDate > toDate) {
      setResult({ ok: false, message: "To date must be on or after from date." });
      return;
    }

    const lines = [
      ["Sponsor", "Phone", "Commitment (RWF)", "Received (RWF)", "Remaining (RWF)", "Fund Type", "Status", "Notes"],
      ...filteredSponsors.map((sponsor) => [
        sponsor.name,
        sponsor.phone ?? "",
        sponsor.commitmentAmount,
        sponsor.rangeReceived,
        Math.max(sponsor.commitmentAmount - sponsor.rangeReceived, 0),
        sponsor.fundType,
        sponsorStatus(sponsor.status, sponsor.commitmentAmount, sponsor.rangeReceived).label,
        sponsor.notes ?? "",
      ]),
    ];
    const csv = lines.map((line) => line.map(csvCell).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sponsors_${fromDate}_to_${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <h2 className="text-base font-semibold text-gray-800">Sponsors</h2>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-wrap sm:items-end sm:gap-3">
          <FieldLabel label="From">
            <input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setRequestedPage(1); }} className="h-9 w-full rounded-lg border border-gray-300 px-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-8" />
          </FieldLabel>
          <FieldLabel label="To">
            <input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setRequestedPage(1); }} className="h-9 w-full rounded-lg border border-gray-300 px-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-8" />
          </FieldLabel>
          <button type="button" onClick={exportCsv} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 text-xs text-white transition hover:bg-green-700 sm:h-8">
            <FileSpreadsheet className="size-4" />
            Export Excel
          </button>
          <button type="button" onClick={() => setEditingSponsor("new")} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs text-white transition hover:bg-blue-700 sm:h-8">
            <PlusCircle className="size-4" />
            Add Sponsor
          </button>
        </div>
      </div>

      <div className="grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <InfoCard label="Total Sponsors" value={String(stats.totalSponsors)} tone="blue" />
        <InfoCard label="Total Received" value={formatCurrency(stats.totalReceived)} tone="green" />
        <InfoCard label="Commitments" value={formatCurrency(stats.totalCommitments)} tone="purple" wide />
      </div>

      <div className="max-w-xl">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setRequestedPage(1); }} placeholder="Search by sponsor name or phone..." className="h-9 w-full rounded-lg border border-gray-300 px-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-8" />
        </label>
        <p className="mt-1 text-xs text-gray-500">{filteredSponsors.length} sponsors found</p>
      </div>

      {result ? (
        <FinanceNoticeBanner notice={result} onClose={() => setResult(null)} />
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Sponsor", "Commitment", "Received", "Remaining", "Status", "Actions"].map((header) => (
                <th key={header} className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filteredSponsors.length ? paginatedSponsors.map((sponsor) => {
              const status = sponsorStatus(sponsor.status, sponsor.commitmentAmount, sponsor.rangeReceived);
              const remaining = Math.max(sponsor.commitmentAmount - sponsor.rangeReceived, 0);
              return (
                <tr key={sponsor.id} className="transition hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <p className="font-medium text-gray-800">{sponsor.name} <span className="text-xs text-gray-400">({sponsor.year})</span></p>
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-700">{sponsor.commitmentAmount > 0 ? formatCurrency(sponsor.commitmentAmount) : "-"}</td>
                  <td className="px-3 py-3 font-medium text-green-600">{formatCurrency(sponsor.rangeReceived)}</td>
                  <td className="px-3 py-3 font-medium text-gray-600">{sponsor.commitmentAmount > 0 ? formatCurrency(remaining) : "-"}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      {sponsor.status !== "inactive" ? <IconButton label="Record Payment" icon={PlusCircle} onClick={() => setPaymentSponsor(sponsor)} /> : null}
                      <IconButton label="View History" icon={FileSearch2} onClick={() => setHistorySponsor(sponsor)} />
                      <IconButton label="Edit Sponsor" icon={Pencil} onClick={() => setEditingSponsor(sponsor)} />
                      {sponsor.status === "inactive" ? <IconButton label="Reactivate Sponsor" icon={UserCheck} onClick={() => restoreSponsor(sponsor)} /> : null}
                      {sponsor.status !== "inactive" ? <IconButton label="Deactivate Sponsor" icon={Trash2} onClick={() => removeSponsor(sponsor)} danger /> : null}
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">No sponsors found for this date range</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredSponsors.length > recordsPerPage ? (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-3 sm:flex-row">
          <p className="text-xs text-gray-500">
            Showing {firstRecordIndex + 1}–{Math.min(firstRecordIndex + recordsPerPage, filteredSponsors.length)} of {filteredSponsors.length} sponsors
          </p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={currentPage === 1} onClick={() => setRequestedPage(currentPage - 1)} className="h-8 rounded-lg border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
              Previous
            </button>
            <span className="min-w-20 text-center text-xs font-medium text-gray-600">Page {currentPage} of {totalPages}</span>
            <button type="button" disabled={currentPage === totalPages} onClick={() => setRequestedPage(currentPage + 1)} className="h-8 rounded-lg border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      ) : null}

      {editingSponsor ? (
        <SponsorModal sponsor={editingSponsor === "new" ? null : editingSponsor} currentYear={currentYear} pending={pending} onClose={() => setEditingSponsor(null)} onSubmit={submitSponsor} />
      ) : null}
      {paymentSponsor ? (
        <SponsorPaymentModal sponsor={paymentSponsor} currentYear={currentYear} pending={pending} onClose={() => setPaymentSponsor(null)} onSubmit={submitSponsorPayment} />
      ) : null}
      {historySponsor ? (
        <SponsorHistoryModal sponsor={historySponsor} payments={historySponsor.payments.filter((payment) => payment.year === currentYear)} currentYear={currentYear} onClose={() => setHistorySponsor(null)} />
      ) : null}
      {confirmAction ? (
        <FinanceConfirmModal
          confirm={confirmAction}
          pending={pending}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => startTransition(confirmAction.action)}
        />
      ) : null}
    </div>
  );
}

function InfoCard({ label, value, tone, wide = false }: { label: string; value: string; tone: "blue" | "green" | "purple"; wide?: boolean }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className={`rounded-lg p-3 ${colors[tone]} ${wide ? "col-span-2 sm:col-span-1" : ""}`}>
      <p className="text-xs text-gray-600">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function MemberContributionStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "amber" | "purple";
}) {
  const colors = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    green: "border-green-100 bg-green-50 text-green-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    purple: "border-purple-100 bg-purple-50 text-purple-700",
  };

  return (
    <div className={`min-w-0 rounded-lg border px-3 py-2 ${colors[tone]}`}>
      <p className="truncate text-[11px] text-gray-600">{label}</p>
      <p className="whitespace-nowrap text-sm font-bold sm:text-base">{value}</p>
    </div>
  );
}

function IconButton({ label, onClick, icon: Icon, danger = false }: { label: string; onClick: () => void; icon: typeof FileSearch2; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex size-8 items-center justify-center rounded-md transition ${danger ? "text-red-600 hover:bg-red-50" : "text-blue-600 hover:bg-blue-50"}`}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}

function progressColor(progress: number, strong = false) {
  if (progress >= 100) return strong ? "bg-green-600" : "bg-green-500";
  if (progress >= 50) return strong ? "bg-blue-600" : "bg-blue-500";
  return strong ? "bg-purple-600" : "bg-yellow-500";
}

function TermContributionProgress({ paid, target, label, onEdit }: { paid: number; target: number; label: string; onEdit?: () => void }) {
  const progress = target > 0 ? Math.min(100, (paid / target) * 100) : paid > 0 ? 100 : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 font-medium text-green-600">
          {formatCurrency(paid)}
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              title={`Edit ${label} payments`}
              aria-label={`Edit ${label} payments`}
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-blue-600 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </span>
        <span className="whitespace-nowrap text-xs text-gray-400">/ {formatCurrency(target)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${progress.toFixed(1)}% complete for ${label}`}>
        <div className={`h-1.5 rounded-full transition-all duration-300 ${progressColor(progress)}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function TotalContributionProgress({ paid, annualAmount, progress }: { paid: number; annualAmount: number; progress: number }) {
  const width = Math.max(0, Math.min(100, progress));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-purple-600">{progress.toFixed(1)}%</span>
        <span className="whitespace-nowrap text-xs text-gray-400">{formatCurrency(paid)} / {formatCurrency(annualAmount)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-valuenow={width} aria-valuemin={0} aria-valuemax={100} aria-label={`${progress.toFixed(1)}% overall progress`}>
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${progressColor(width, true)}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function ContributionActionButton({ label, onClick, icon: Icon, tone }: { label: string; onClick: () => void; icon: typeof FileSearch2; tone: "blue" | "green" | "amber" }) {
  const colors = {
    blue: "text-blue-600 hover:bg-blue-50",
    green: "text-green-600 hover:bg-green-50",
    amber: "text-amber-600 hover:bg-amber-50",
  };
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={`inline-flex size-7 items-center justify-center rounded-md transition ${colors[tone]}`}>
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}

function ExpenseActionButton({ label, onClick, icon: Icon, tone }: { label: string; onClick: () => void; icon: typeof FileSearch2; tone: "blue" | "green" | "red" }) {
  const colors = {
    blue: "text-blue-600 hover:bg-blue-50",
    green: "text-green-600 hover:bg-green-50",
    red: "text-red-600 hover:bg-red-50",
  };
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={`inline-flex size-8 items-center justify-center rounded-md transition sm:size-7 ${colors[tone]}`}>
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}

function MemberSearchField({
  label,
  user,
  users,
  onUserChange,
  changeLabel = "Remove",
}: {
  label: string;
  user: UserOption | null;
  users: UserOption[];
  onUserChange: (user: UserOption | null) => void;
  changeLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const matches = normalized
    ? users
        .filter((item) => item.name.toLowerCase().includes(normalized))
        .slice(0, 8)
    : [];

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input
          type="text"
          value={user ? user.name : query}
          onChange={(event) => {
            onUserChange(null);
            setQuery(event.target.value);
          }}
          placeholder="Search member by name..."
          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          autoComplete="off"
        />
        {user ? (
          <button type="button" onClick={() => { onUserChange(null); setQuery(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-red-500 hover:text-red-700">
            {changeLabel}
          </button>
        ) : null}
        {!user && normalized.length >= 2 ? (
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl">
            {matches.length ? matches.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onUserChange(item);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left transition last:border-0 hover:bg-blue-50"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                  {item.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-gray-800">{item.name}</span>
                </span>
              </button>
            )) : (
              <div className="px-3 py-4 text-center text-sm text-gray-500">No members found</div>
            )}
          </div>
        ) : null}
      </div>
      {user ? (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-blue-50 p-2">
          <span className="text-sm font-medium text-gray-800">{user.name}</span>
          <button type="button" onClick={() => { onUserChange(null); setQuery(""); }} className="text-sm text-red-500 hover:text-red-700">{changeLabel}</button>
        </div>
      ) : null}
    </div>
  );
}

function AnnualContributionModal({
  user,
  users,
  year,
  contribution,
  pending,
  onUserChange,
  onClose,
  onSubmit,
}: {
  user: UserOption | null;
  users: UserOption[];
  year: number;
  contribution: Contribution | undefined;
  pending: boolean;
  onUserChange: (user: UserOption | null) => void;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <Modal title="Set Annual Contribution" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        <input type="hidden" name="year" value={year} />
        <MemberSearchField label="Select Member" user={user} users={users} onUserChange={onUserChange} />
        <input type="hidden" name="user_id" value={user?.id ?? ""} />
        <FieldLabel label="Annual Amount (RWF)">
          <input name="annual_amount" type="number" min={0} step="0.01" required defaultValue={contribution?.annualAmount ?? 0} className={fieldClass} />
        </FieldLabel>
        <FieldLabel label="Year">
          <span className="flex h-10 items-center rounded-lg bg-gray-100 px-3 text-sm font-medium text-gray-800">{year}</span>
        </FieldLabel>
        <FieldLabel label="Notes">
          <textarea name="notes" defaultValue={contribution?.notes ?? ""} rows={2} className={`${fieldClass} h-auto py-2`} placeholder="Add any notes about this contribution..." />
        </FieldLabel>
        <ModalFooter pending={pending} disabled={!user} submitLabel="Set Contribution" onClose={onClose} />
      </form>
    </Modal>
  );
}

function PaymentModal({
  user,
  users,
  year,
  defaultDate,
  termNumbers,
  pending,
  onUserChange,
  onClose,
  onSubmit,
}: {
  user: UserOption | null;
  users: UserOption[];
  year: number;
  defaultDate: string;
  termNumbers: number[];
  pending: boolean;
  onUserChange: (user: UserOption | null) => void;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <Modal title="Record Payment" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        <input type="hidden" name="year" value={year} />
        <MemberSearchField label="Select Member" user={user} users={users} onUserChange={onUserChange} changeLabel="Change" />
        <input type="hidden" name="user_id" value={user?.id ?? ""} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldLabel label="Term">
            <select name="term" className={fieldClass}>
              {termNumbers.map((term) => (
                <option key={term} value={term}>Term {term}</option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel label="Amount">
            <input name="amount" type="number" min={1} step="0.01" required className={fieldClass} />
          </FieldLabel>
          <FieldLabel label="Year">
            <span className="flex h-10 items-center rounded-lg bg-gray-100 px-3 text-sm font-medium text-gray-800">{year}</span>
          </FieldLabel>
          <FieldLabel label="Payment Method">
            <select name="payment_method" defaultValue="cash" className={fieldClass}>
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
            </select>
          </FieldLabel>
          <FieldLabel label="Payment Date">
            <input name="payment_date" type="date" defaultValue={defaultDate} className={fieldClass} />
          </FieldLabel>
          <FieldLabel label="Reference number">
            <input name="reference_number" placeholder="Receipt or transaction #" className={fieldClass} />
          </FieldLabel>
        </div>
        <FieldLabel label="Notes">
          <textarea name="notes" rows={2} className={`${fieldClass} h-auto py-2`} placeholder="Add any notes about this payment..." />
        </FieldLabel>
        <ModalFooter pending={pending} disabled={!user} submitLabel="Submit Payment" onClose={onClose} />
      </form>
    </Modal>
  );
}

function DetailsModal({
  row,
  payments,
  term,
  year,
  pending,
  onUpdateTermTotal,
  onEditPayment,
  onClose,
}: {
  row: ContributionRow;
  payments: Payment[];
  term: number | null;
  year: number;
  pending: boolean;
  onUpdateTermTotal: (formData: FormData) => void;
  onEditPayment: (payment: Payment) => void;
  onClose: () => void;
}) {
  const displayedTerms = term ? row.termRows.filter((item) => item.term === term) : row.termRows;
  const displayedPayments = term ? payments.filter((payment) => payment.term === term) : payments;

  return (
    <Modal title={term ? `Edit Term ${term} Contributions` : "Contribution Details"} onClose={onClose} width="max-w-4xl">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900">{row.user.name}</h3>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <InfoCard label="Annual Amount" value={formatCurrency(row.annualAmount)} tone="blue" />
          <InfoCard label="Total Paid" value={formatCurrency(row.totalPaid)} tone="green" />
          <InfoCard label="Outstanding" value={formatCurrency(Math.max(row.annualAmount - row.totalPaid, 0))} tone="purple" />
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="mb-2 text-sm font-medium text-gray-700">Overall Progress</p>
          <TotalContributionProgress paid={row.totalPaid} annualAmount={row.annualAmount} progress={row.progress} />
        </div>
        <SimpleTable title="Term Summary" headers={["Term", "Target", "Paid", "Balance"]} empty="No terms found">
          {displayedTerms.map((termRow) => (
            <tr key={termRow.term} className="border-b border-gray-100">
              <td className="px-4 py-3">Term {termRow.term}</td>
              <td className="px-4 py-3">{formatCurrency(termRow.target)}</td>
              <td className="px-4 py-3 font-semibold text-green-600">
                {term === termRow.term ? (
                  <form
                    className="flex min-w-56 items-center gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      onUpdateTermTotal(new FormData(event.currentTarget));
                    }}
                  >
                    <input type="hidden" name="user_id" value={row.user.id} />
                    <input type="hidden" name="year" value={year} />
                    <input type="hidden" name="term" value={termRow.term} />
                    <input type="hidden" name="payment_ids" value={JSON.stringify(displayedPayments.map((payment) => payment.id))} />
                    <label className="relative block min-w-0 flex-1">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500">RWF</span>
                      <input
                        name="amount"
                        type="number"
                        min={0}
                        step="0.01"
                        required
                        defaultValue={termRow.paid}
                        aria-label={`Term ${termRow.term} paid amount`}
                        className="h-9 w-full rounded-lg border border-green-300 bg-white pl-12 pr-3 text-sm font-semibold text-green-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                    <button type="submit" disabled={pending} className="h-9 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
                      {pending ? "Saving..." : "Save"}
                    </button>
                  </form>
                ) : formatCurrency(termRow.paid)}
              </td>
              <td className="px-4 py-3">{formatCurrency(Math.max(termRow.target - termRow.paid, 0))}</td>
            </tr>
          ))}
        </SimpleTable>
        <SimpleTable title="Payment Records" headers={["Term", "Amount", "Date", "Method", "Recorded By", "Action"]} empty="No payment records found">
          {displayedPayments.map((payment) => (
            <tr key={payment.id} className="border-b border-gray-100">
              <td className="px-4 py-3">Term {payment.term ?? "-"}</td>
              <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(payment.amount)}</td>
              <td className="px-4 py-3">{payment.paymentDate}</td>
              <td className="px-4 py-3 capitalize">{payment.paymentMethod.replaceAll("_", " ")}</td>
              <td className="px-4 py-3">{payment.createdByName}</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onEditPayment(payment)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </SimpleTable>
      </div>
    </Modal>
  );
}

function PaymentDetailsModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  return (
    <Modal title="Payment Details" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-green-100 bg-green-50 p-3">
          <div>
            <p className="text-xs text-green-700">Payment Amount</p>
            <p className="text-xl font-bold text-green-700">{formatCurrency(payment.amount)}</p>
          </div>
          <div className="flex size-9 items-center justify-center rounded-lg bg-white text-green-600">
            <Receipt className="size-5" aria-hidden="true" />
          </div>
        </div>
        <div className="border-b border-gray-100 pb-3">
          <p className="text-xs text-gray-500">Member</p>
          <p className="text-sm font-semibold text-gray-800">{payment.userName}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <DetailItem label="Term" value={`Term ${payment.term ?? "-"}`} />
          <DetailItem label="Year" value={String(payment.year)} />
          <DetailItem label="Payment Date" value={payment.paymentDate} />
          <DetailItem label="Payment Method" value={methodLabel(payment.paymentMethod)} />
          {payment.referenceNumber ? <DetailItem label="Reference" value={payment.referenceNumber} /> : null}
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <p className="text-xs text-gray-500">Notes</p>
          <p className="text-sm text-gray-700">{payment.notes || "No notes"}</p>
        </div>
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-500">Recorded By</p>
          <p className="text-sm font-medium text-gray-800">{payment.createdByName}</p>
          <p className="text-xs text-gray-400">{new Date(payment.createdAt).toLocaleString()}</p>
        </div>
      </div>
    </Modal>
  );
}

function EditPaymentModal({
  payment,
  users,
  termNumbers,
  pending,
  onClose,
  onSubmit,
}: {
  payment: Payment;
  users: UserOption[];
  termNumbers: number[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const user = users.find((item) => item.id === payment.userId);
  return (
    <Modal title="Edit Payment" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        <input type="hidden" name="payment_id" value={payment.id} />
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Member</p>
          <p className="text-sm font-semibold text-gray-800">{user?.name ?? payment.userName}</p>
          <p className="text-xs text-gray-500">Year {payment.year}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldLabel label="Term">
            <select name="term" defaultValue={payment.term ?? 1} className={fieldClass}>
              {termNumbers.map((term) => (
                <option key={term} value={term}>Term {term}</option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel label="Amount">
            <input name="amount" type="number" min={1} step="0.01" required defaultValue={payment.amount} className={fieldClass} />
          </FieldLabel>
          <FieldLabel label="Payment Method">
            <select name="payment_method" defaultValue={payment.paymentMethod} className={fieldClass}>
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </FieldLabel>
          <FieldLabel label="Payment Date">
            <input name="payment_date" type="date" required defaultValue={payment.paymentDateRaw} className={fieldClass} />
          </FieldLabel>
          <FieldLabel label="Reference number">
            <input name="reference_number" defaultValue={payment.referenceNumber ?? ""} className={fieldClass} />
          </FieldLabel>
        </div>
        <FieldLabel label="Notes">
          <textarea name="notes" rows={3} defaultValue={payment.notes ?? ""} className={`${fieldClass} h-auto py-2`} />
        </FieldLabel>
        <ModalFooter pending={pending} submitLabel="Save Payment" onClose={onClose} />
      </form>
    </Modal>
  );
}

function SponsorModal({
  sponsor,
  currentYear,
  pending,
  onClose,
  onSubmit,
}: {
  sponsor: Sponsor | null;
  currentYear: number;
  pending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <Modal title={sponsor ? "Edit Sponsor" : "Add Sponsor"} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        <input type="hidden" name="id" value={sponsor?.id ?? ""} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldLabel label="Sponsor Name">
            <input name="name" required defaultValue={sponsor?.name ?? ""} className={fieldClass} />
          </FieldLabel>
          <FieldLabel label="Year">
            <input name="year" type="number" min={2000} max={2100} defaultValue={sponsor?.year ?? currentYear} className={fieldClass} />
          </FieldLabel>
          <FieldLabel label="Email">
            <input name="email" type="email" defaultValue={sponsor?.email ?? ""} className={fieldClass} />
          </FieldLabel>
          <FieldLabel label="Phone">
            <input name="phone" defaultValue={sponsor?.phone ?? ""} className={fieldClass} />
          </FieldLabel>
          <FieldLabel label="Commitment Amount">
            <input name="commitment_amount" type="number" min={0} step="0.01" defaultValue={sponsor?.commitmentAmount ?? 0} className={fieldClass} />
          </FieldLabel>
          <FieldLabel label="Fund Type">
            <select name="fund_type" defaultValue={sponsor?.fundType ?? "one_time"} className={fieldClass}>
              <option value="one_time">One Time</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </FieldLabel>
        </div>
        <FieldLabel label="Notes">
          <textarea name="notes" rows={3} defaultValue={sponsor?.notes ?? ""} className={`${fieldClass} h-auto py-2`} />
        </FieldLabel>
        <ModalFooter pending={pending} submitLabel={sponsor ? "Update Sponsor" : "Add Sponsor"} onClose={onClose} />
      </form>
    </Modal>
  );
}

function SponsorPaymentModal({
  sponsor,
  currentYear,
  pending,
  onClose,
  onSubmit,
}: {
  sponsor: Sponsor;
  currentYear: number;
  pending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <Modal title="Record Sponsor Payment" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        <input type="hidden" name="sponsor_id" value={sponsor.id} />
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Sponsor</p>
          <p className="text-sm font-semibold text-gray-800">{sponsor.name}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldLabel label="Year">
            <input name="year" type="number" min={2000} max={2100} defaultValue={currentYear} className={fieldClass} />
          </FieldLabel>
          <FieldLabel label="Amount">
            <input name="amount" type="number" min={1} step="0.01" required className={fieldClass} />
          </FieldLabel>
          <FieldLabel label="Payment Method">
            <select name="payment_method" defaultValue="cash" className={fieldClass}>
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </FieldLabel>
          <FieldLabel label="Payment Date">
            <input name="payment_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={fieldClass} />
          </FieldLabel>
        </div>
        <FieldLabel label="Notes">
          <textarea name="notes" rows={3} className={`${fieldClass} h-auto py-2`} />
        </FieldLabel>
        <ModalFooter pending={pending} submitLabel="Record Payment" onClose={onClose} />
      </form>
    </Modal>
  );
}

function SponsorHistoryModal({
  sponsor,
  payments,
  currentYear,
  onClose,
}: {
  sponsor: Sponsor;
  payments: SponsorPayment[];
  currentYear: number;
  onClose: () => void;
}) {
  return (
    <Modal title="Sponsor Payment History" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900">{sponsor.name}</h3>
          <p className="text-sm text-gray-500">Payments for {currentYear}</p>
        </div>
        {payments.length ? (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div key={payment.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{formatCurrency(payment.amount)}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>{payment.paymentDate}</span>
                      <span>{methodLabel(payment.paymentMethod)}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{payment.recordedBy}</span>
                </div>
                {payment.notes ? <p className="mt-2 text-xs text-gray-500">{payment.notes}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">No payments recorded for {currentYear}</div>
        )}
      </div>
    </Modal>
  );
}

function ExpenseModal({
  currentYear,
  availableBalance,
  users,
  pending,
  onClose,
  onSubmit,
}: {
  currentYear: number;
  availableBalance: number;
  users: UserOption[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const [approverSearch, setApproverSearch] = useState("");
  const [selectedApproverId, setSelectedApproverId] = useState<number | null>(null);
  const [approverListOpen, setApproverListOpen] = useState(false);
  const [approverError, setApproverError] = useState("");
  const normalizedApproverSearch = approverSearch.trim().toLowerCase();
  const matchingApprovers = users.filter((user) => {
    if (!normalizedApproverSearch) return true;
    return user.name.toLowerCase().includes(normalizedApproverSearch);
  });

  return (
    <Modal title="New Expense" onClose={onClose} width="max-w-lg">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!selectedApproverId) {
            setApproverError("Search for and select an authorized approver.");
            setApproverListOpen(true);
            return;
          }
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        <input type="hidden" name="year" value={currentYear} />
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
          <p className="text-xs text-blue-700">Available Account Balance</p>
          <p className="text-lg font-bold text-blue-800">{formatCurrency(availableBalance)}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldLabel label="Amount">
            <input name="amount" type="number" min={1} max={availableBalance} step="0.01" required className={fieldClass} />
          </FieldLabel>
          <FieldLabel label="Date">
            <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={fieldClass} />
          </FieldLabel>
        </div>
        <FieldLabel label="Reason">
          <textarea name="description" rows={3} required className={`${fieldClass} h-auto py-2`} />
        </FieldLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldLabel label="Reference number">
            <input name="reference_number" placeholder="Invoice or request #" className={fieldClass} />
          </FieldLabel>
          <FieldLabel label="Receipt / document">
            <input name="receipt" type="file" accept="application/pdf,image/jpeg,image/png" className={`${fieldClass} py-2 text-xs`} />
          </FieldLabel>
        </div>
        <input type="hidden" name="approver_id_1" value={selectedApproverId ?? ""} />
        <div
          className="relative"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setApproverListOpen(false);
            }
          }}
        >
          <label htmlFor="expense-approver-search" className="mb-1 block text-sm font-medium text-gray-700">Approver</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              id="expense-approver-search"
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={approverListOpen}
              aria-controls="expense-approver-results"
              autoComplete="off"
              value={approverSearch}
              onFocus={() => setApproverListOpen(true)}
              onChange={(event) => {
                setApproverSearch(event.target.value);
                setSelectedApproverId(null);
                setApproverError("");
                setApproverListOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setApproverListOpen(false);
              }}
              placeholder="Search approver by name..."
              className={`${fieldClass} pl-9 ${approverError ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
            />
          </div>
          {approverError ? <p className="mt-1 text-xs text-red-600">{approverError}</p> : null}
          {approverListOpen ? (
            <div id="expense-approver-results" role="listbox" className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
              {matchingApprovers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  role="option"
                  aria-selected={selectedApproverId === user.id}
                  onClick={() => {
                    setSelectedApproverId(user.id);
                    setApproverSearch(user.name);
                    setApproverError("");
                    setApproverListOpen(false);
                  }}
                  className={`block w-full rounded-md px-3 py-2 text-left transition hover:bg-blue-50 ${selectedApproverId === user.id ? "bg-blue-50" : ""}`}
                >
                  <span className="block text-sm font-medium text-gray-800">{user.name}</span>
                </button>
              ))}
              {!matchingApprovers.length && normalizedApproverSearch ? (
                <p className="px-3 py-5 text-center text-sm text-gray-500">No approvers found</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <ModalFooter pending={pending} disabled={availableBalance <= 0} submitLabel="Save Expense" onClose={onClose} />
      </form>
    </Modal>
  );
}

function ExpenseDetailsModal({ expense, onClose }: { expense: Expense; onClose: () => void }) {
  return (
    <Modal title="Expense Details" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg bg-blue-50 p-4 text-center">
          <p className="text-xs text-gray-500">Amount</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(expense.amount)}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DetailBox label="Date" value={expense.date} />
          <DetailBox label="Status" value={expenseStatusLabel(expense.status)} />
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Description</p>
          <p className="text-sm text-gray-800">{expense.description || "-"}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border-l-4 border-blue-500 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Recorded By</p>
            <p className="text-sm font-medium text-gray-800">{expense.createdByName}</p>
          </div>
          <div className="rounded-lg border-l-4 border-green-500 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Approver</p>
            <p className="text-sm font-medium text-gray-800">{expense.approver1Name ?? expense.approver2Name ?? "-"}</p>
          </div>
        </div>
        {expense.approvedByName ? (
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-xs text-green-700">Approved By</p>
            <p className="text-sm font-semibold text-green-800">{expense.approvedByName}</p>
          </div>
        ) : null}
        {expense.referenceNumber ? <DetailBox label="Reference" value={expense.referenceNumber} /> : null}
        {expense.rejectionReason ? (
          <div className="rounded-lg bg-red-50 p-3"><p className="text-xs text-red-700">Rejection reason</p><p className="text-sm text-red-900">{expense.rejectionReason}</p></div>
        ) : null}
        {expense.voidReason ? (
          <div className="rounded-lg bg-gray-100 p-3"><p className="text-xs text-gray-500">Void reason</p><p className="text-sm text-gray-800">{expense.voidReason}</p></div>
        ) : null}
        {expense.hasReceipt ? (
          <a href={`/admin/finance/expenses/${expense.id}/receipt`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"><FileText className="size-4" />View supporting document</a>
        ) : null}
      </div>
    </Modal>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium capitalize text-gray-800">{value}</p>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium capitalize text-gray-800">{value}</p>
    </div>
  );
}

function Modal({ title, children, onClose, width = "max-w-xl" }: { title: string; children: ReactNode; onClose: () => void; width?: string }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-stretch bg-gray-900/40 p-0 sm:place-items-center sm:px-4 sm:py-6">
      <div className={`flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-2xl ${width}`}>
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function ModalFooter({ pending, disabled = false, submitLabel, onClose }: { pending: boolean; disabled?: boolean; submitLabel: string; onClose: () => void }) {
  return (
    <div className="sticky bottom-0 -mx-4 grid grid-cols-2 gap-2 border-t border-gray-100 bg-white px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-3 sm:mx-0 sm:flex sm:justify-end sm:px-0 sm:pb-0 sm:pt-4">
      <button type="button" onClick={onClose} className="h-9 rounded-lg border border-gray-300 px-4 text-sm text-gray-700 transition hover:bg-gray-50">
        Cancel
      </button>
      <button type="submit" disabled={pending || disabled} className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60">
        {pending ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}

const fieldClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function methodLabel(method: string) {
  const labels: Record<string, string> = {
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    mobile_money: "Mobile Money",
    cheque: "Cheque",
    card: "Card",
    other: "Other",
  };
  return labels[method] ?? method.replaceAll("_", " ");
}

function methodBadge(method: string) {
  const badges: Record<string, string> = {
    cash: "bg-green-100 text-green-700",
    bank_transfer: "bg-blue-100 text-blue-700",
    mobile_money: "bg-purple-100 text-purple-700",
    cheque: "bg-yellow-100 text-yellow-700",
    card: "bg-indigo-100 text-indigo-700",
    other: "bg-gray-100 text-gray-700",
  };
  return badges[method] ?? "bg-gray-100 text-gray-700";
}

function sponsorStatus(status: string, commitment: number, received: number) {
  if (status === "inactive") {
    return { label: "Inactive", className: "bg-gray-200 text-gray-700" };
  }
  if (commitment === 0 && received === 0) {
    return { label: "No Commitment", className: "bg-gray-100 text-gray-600" };
  }
  if (commitment === 0 && received > 0) {
    return { label: "Direct Gift", className: "bg-purple-100 text-purple-700" };
  }
  if (received > commitment && commitment > 0) {
    return { label: "Overpaid", className: "bg-orange-100 text-orange-700" };
  }
  if (received >= commitment && commitment > 0) {
    return { label: "Completed", className: "bg-green-100 text-green-700" };
  }
  return { label: "Active", className: "bg-blue-100 text-blue-700" };
}

function expenseStatusBadge(status: string) {
  if (status === "approved") return "bg-green-100 text-green-700";
  if (status === "pending") return "bg-yellow-100 text-yellow-700";
  if (status === "void_pending") return "bg-orange-100 text-orange-700";
  if (status === "voided") return "bg-gray-200 text-gray-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
}

function expenseStatusLabel(status: string) {
  return status === "void_pending" ? "Void Pending" : status.charAt(0).toUpperCase() + status.slice(1);
}

function ExpenseStat({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "blue" | "yellow" | "green" | "purple";
  icon: typeof ChartPie;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-500",
    yellow: "bg-yellow-50 text-yellow-500",
    green: "bg-green-50 text-green-500",
    purple: "bg-purple-50 text-purple-500",
  };
  const textColors = {
    blue: "text-gray-800",
    yellow: "text-yellow-600",
    green: "text-green-600",
    purple: "text-purple-600",
  };
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
          <p className={`text-lg font-bold ${textColors[tone]}`}>{formatCurrency(value)}</p>
        </div>
        <div className={`flex size-8 items-center justify-center rounded-lg ${colors[tone]}`}>
          <Icon className="size-4" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function percentagesFromSetting(setting: FinanceTermSetting | undefined, fallbackTerms: number) {
  if (!setting) return distributeDefault(fallbackTerms);
  return Array.from({ length: setting.numberOfTerms }, (_, index) => {
    const termNumber = setting.termNumbers[index] ?? index + 1;
    return Number(setting.termPercentages[String(termNumber)] ?? 0);
  });
}

function distributeDefault(numberOfTerms: number) {
  const equal = Math.floor((100 / numberOfTerms) * 100) / 100;
  const values = Array.from({ length: numberOfTerms }, () => equal);
  const total = values.reduce((sum, value) => sum + value, 0);
  values[values.length - 1] = Number((values[values.length - 1] + (100 - total)).toFixed(2));
  return values;
}

function formatCurrency(value: number) {
  return `RWF ${value.toLocaleString()}`;
}

function FinanceStat({
  label,
  value,
  tone,
  icon: Icon,
  format = "currency",
}: {
  label: string;
  value: number;
  tone: "emerald" | "rose" | "sky" | "indigo" | "amber" | "violet";
  icon: typeof HandCoins;
  format?: "currency" | "percentage";
}) {
  const colors = {
    emerald: "border-emerald-100 from-white via-emerald-50 to-teal-50/40 text-emerald-700 bg-emerald-100",
    rose: "border-rose-100 from-white via-rose-50 to-red-50/40 text-rose-700 bg-rose-100",
    sky: "border-sky-100 from-white via-sky-50 to-blue-50/40 text-sky-700 bg-sky-100",
    indigo: "border-indigo-100 from-white via-indigo-50 to-violet-50/30 text-indigo-700 bg-indigo-100",
    amber: "border-amber-100 from-white via-amber-50 to-orange-50/40 text-amber-700 bg-amber-100",
    violet: "border-violet-100 from-white via-violet-50 to-purple-50/40 text-violet-700 bg-violet-100",
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 shadow-sm ${colors[tone]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {format === "percentage" ? `${value}%` : formatCurrency(value)}
          </p>
        </div>
        <div className={`flex size-10 items-center justify-center rounded-lg ${colors[tone]}`}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function RecentList({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b bg-gray-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {hasChildren ? children : <div className="px-4 py-8 text-center text-sm text-gray-400">{empty}</div>}
      </div>
    </section>
  );
}

function RecentRow({ title, subtitle, amount, danger = false }: { title: string; subtitle: string; amount: number; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-gray-800">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <p className={`text-sm font-bold ${danger ? "text-rose-600" : "text-emerald-600"}`}>{formatCurrency(amount)}</p>
    </div>
  );
}

function SimpleTable({ title, headers, empty, children }: { title: string; headers: string[]; empty: string; children: ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b bg-gray-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white text-left text-xs uppercase text-gray-500">
            <tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}</tr>
          </thead>
          <tbody>
            {hasChildren ? children : (
              <tr>
                <td colSpan={headers.length} className="px-4 py-10 text-center text-gray-400">{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
