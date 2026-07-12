import { MyContributionsClient } from "@/components/my-contributions-client";
import { requireUser } from "@/lib/auth";
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
  const user = await requireUser();
  const params = await searchParams;
  const currentYear = new Date().getFullYear();

  const [contributions, allPayments, termSettings] = await Promise.all([
    prisma.contribution.findMany({
      where: { userId: user.id },
      orderBy: { year: "desc" },
    }),
    prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.financeTermSetting.findMany({ orderBy: { currentYear: "desc" } }),
  ]);

  const years = Array.from(
    new Set([
      currentYear,
      ...contributions.map((item) => item.year),
      ...allPayments.map((item) => item.year),
      ...termSettings.map((item) => item.currentYear).filter((year): year is number => Boolean(year)),
    ]),
  ).sort((a, b) => b - a);

  const selectedYear = params.year && years.includes(Number(params.year)) ? Number(params.year) : years[0] ?? currentYear;
  const contribution = contributions.find((item) => item.year === selectedYear);
  const payments = allPayments.filter((item) => item.year === selectedYear);
  const setting = termSettings.find((item) => item.currentYear === selectedYear) ?? termSettings[0];
  const settingTerms = setting?.numberOfTerms ?? 3;
  const fallbackTerms = Array.from({ length: settingTerms }, (_, index) => index + 1);
  const termNumbers = parseNumberArray(setting?.termNumbers, fallbackTerms);
  const percentages = parsePercentageMap(setting?.termPercentages, termNumbers);
  const finalPercentages = Object.values(percentages).some((value) => value > 0) ? percentages : defaultPercentages(termNumbers);
  const annualAmount = money(contribution?.annualAmount);

  const terms = termNumbers.map((term) => {
    const percentage = Number(finalPercentages[String(term)] ?? 0);
    const target = (annualAmount * percentage) / 100;
    const paid = payments.filter((payment) => payment.term === term).reduce((sum, payment) => sum + money(payment.amount), 0);
    const remaining = Math.max(target - paid, 0);
    const progress = target > 0 ? Math.min(100, Math.round((paid / target) * 100)) : 0;
    const status = target > 0 && paid >= target ? "completed" : paid > 0 ? "partial" : "pending";
    return { term, percentage, target, paid, remaining, progress, status };
  });

  const totalRequired = terms.reduce((sum, term) => sum + term.target, 0);
  const totalPaid = payments.reduce((sum, payment) => sum + money(payment.amount), 0);
  const remainingAmount = Math.max(totalRequired - totalPaid, 0);
  const progressPercent = totalRequired > 0 ? Math.min(100, Math.round((totalPaid / totalRequired) * 100)) : 0;

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
      terms={terms}
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
