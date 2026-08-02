import { MyContributionsClient } from "@/components/my-contributions-client";
import { canMemberCommitAnnualContribution } from "@/lib/annual-contribution-rules";
import { getUserPermissionSet, permissionSetHas, requirePageAccess } from "@/lib/auth";
import { calculateContributionRate, calculateContributionTermTarget } from "@/lib/finance-rules";
import { prisma } from "@/lib/prisma";

type ContributionsPageProps = {
  searchParams: Promise<{ year?: string }>;
};

function money(value: unknown) {
  return Number(value ?? 0);
}

function formatDate(date: Date | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(date);
}

function parseNumberArray(value: string | null | undefined, fallback: number[]) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      const values = parsed.map(Number).filter((item) => Number.isFinite(item));
      return values.length ? values : fallback;
    }
    if (parsed && typeof parsed === "object") {
      const values = Object.values(parsed).map(Number).filter((item) => Number.isFinite(item));
      return values.length ? values : fallback;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function parsePercentageMap(value: string | null | undefined, termNumbers: number[]) {
  if (!value) return Object.fromEntries(termNumbers.map((term) => [String(term), 0]));

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return Object.fromEntries(termNumbers.map((term, index) => [String(term), Number(parsed[index]) || 0]));
    }
    if (parsed && typeof parsed === "object") {
      return Object.fromEntries(Object.entries(parsed).map(([key, item]) => [String(key), Number(item) || 0]));
    }
  } catch {
    return Object.fromEntries(termNumbers.map((term) => [String(term), 0]));
  }

  return Object.fromEntries(termNumbers.map((term) => [String(term), 0]));
}

function defaultPercentages(termNumbers: number[]) {
  const equal = Math.floor((100 / termNumbers.length) * 100) / 100;
  const values = Object.fromEntries(termNumbers.map((term) => [String(term), equal]));
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  values[String(termNumbers[termNumbers.length - 1])] += 100 - total;
  return values;
}

export default async function MyContributionsPage({ searchParams }: ContributionsPageProps) {
  const user = await requirePageAccess("contributions");
  const permissions = await getUserPermissionSet(user);
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Kigali", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  const [contributions, allPayments, contributionEvents, activeMemberCount, termSettings] = await Promise.all([
    prisma.contribution.findMany({
      where: { userId: user.id },
      orderBy: { year: "desc" },
    }),
    prisma.payment.findMany({
      where: { userId: user.id, status: { not: "voided" } },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.contributionEvent.findMany({
      where: { status: { in: ["active", "closed"] } },
      include: {
        payments: {
          where: { status: { not: "voided" } },
          orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
        },
      },
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
    }),
    prisma.user.count({ where: { status: "active" } }),
    prisma.financeTermSetting.findMany({ orderBy: { currentYear: "desc" } }),
  ]);

  const years = Array.from(
    new Set([
      currentYear,
      ...contributions.map((item) => item.year),
      ...allPayments.map((item) => item.year),
      ...contributionEvents.map((item) => item.year),
      ...termSettings.map((item) => item.currentYear).filter((year): year is number => Boolean(year)),
    ]),
  ).sort((a, b) => b - a);

  const selectedYear = params.year && years.includes(Number(params.year)) ? Number(params.year) : years[0] ?? currentYear;
  const contribution = contributions.find((item) => item.year === selectedYear);
  const payments = allPayments.filter((item) => item.year === selectedYear);
  const setting = termSettings.find((item) => item.currentYear === selectedYear);
  const settingTerms = setting?.numberOfTerms ?? 3;
  const fallbackTerms = Array.from({ length: settingTerms }, (_, index) => index + 1);
  const termNumbers = parseNumberArray(setting?.termNumbers, fallbackTerms);
  const percentages = parsePercentageMap(setting?.termPercentages, termNumbers);
  const finalPercentages = Object.values(percentages).some((value) => value > 0) ? percentages : defaultPercentages(termNumbers);
  const annualAmount = money(contribution?.annualAmount);
  const termPercentages = termNumbers.map((term) => Number(finalPercentages[String(term)] ?? 0));

  const terms = termNumbers.map((term, index) => {
    const percentage = termPercentages[index];
    const target = calculateContributionTermTarget(annualAmount, percentage);
    const termPayments = payments.filter((payment) => payment.term === term);
    const paid = termPayments.reduce((sum, payment) => sum + money(payment.amount), 0);
    const remaining = Math.max(target - paid, 0);
    const progress = target > 0 ? Math.min(100, Math.round((paid / target) * 100)) : 0;
    const status = target > 0 && paid >= target ? "completed" : paid > 0 ? "partial" : "pending";
    const latestPayment = termPayments[0];
    return { term, percentage, target, paid, remaining, progress, status, lastPaymentDate: latestPayment ? formatDate(latestPayment.paymentDate) : null };
  });

  const totalRequired = annualAmount;
  const totalPaid = payments.reduce((sum, payment) => sum + money(payment.amount), 0);
  const remainingAmount = Math.max(totalRequired - totalPaid, 0);
  const progressPercent = calculateContributionRate(totalPaid, totalRequired);
  const visibleContributionEvents = contributionEvents.filter((event) => {
    if (event.year !== selectedYear) return false;
    return event.status === "active" || event.payments.some((payment) => payment.userId === user.id);
  });

  return (
    <MyContributionsClient
      currentYear={selectedYear}
      availableYears={years}
      annualAmount={annualAmount}
      totalRequired={totalRequired}
      totalPaid={totalPaid}
      remainingAmount={remainingAmount}
      progressPercent={progressPercent}
      hasContribution={Boolean(contribution)}
      canCommit={permissionSetHas(permissions, "contributions", "create") && Boolean(setting)}
      commitmentEnabled={canMemberCommitAnnualContribution(setting)}
      terms={terms}
      events={visibleContributionEvents.map((event) => {
        const memberPayments = event.payments.filter((payment) => payment.userId === user.id);
        const contributorCount = new Set(event.payments.map((payment) => payment.userId).filter((userId): userId is number => userId !== null)).size;
        const expired = event.status === "active" && event.endDate ? event.endDate.toISOString().slice(0, 10) < today : false;
        return {
          id: event.id,
          title: event.title,
          description: event.description,
          startDate: formatDate(event.startDate),
          endDate: formatDate(event.endDate),
          status: expired ? "expired" : event.status,
          totalRaised: event.payments.reduce((sum, payment) => sum + money(payment.amount), 0),
          contributorCount,
          totalMembers: activeMemberCount,
          memberPaid: memberPayments.reduce((sum, payment) => sum + money(payment.amount), 0),
          payments: memberPayments.map((payment) => ({
            id: payment.id,
            amount: money(payment.amount),
            paymentMethod: payment.paymentMethod ?? "cash",
            paymentDate: formatDate(payment.paymentDate),
          })),
        };
      })}
      payments={payments.map((payment) => ({
        id: payment.id,
        term: payment.term,
        amount: money(payment.amount),
        paymentMethod: payment.paymentMethod ?? "cash",
        referenceNumber: payment.referenceNumber,
        notes: payment.notes,
        status: payment.status ?? "completed",
        paymentDate: formatDate(payment.paymentDate),
      }))}
    />
  );
}
