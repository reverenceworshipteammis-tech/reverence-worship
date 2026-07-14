import { requirePageAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FinanceClient } from "@/components/finance-client";

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
  if (!value) {
    return Object.fromEntries(termNumbers.map((termNumber) => [String(termNumber), 0]));
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).map(([key, item]) => [String(key), Number(item) || 0]),
      );
    }
    if (Array.isArray(parsed)) {
      return Object.fromEntries(termNumbers.map((termNumber, index) => [String(termNumber), Number(parsed[index]) || 0]));
    }
  } catch {
    return Object.fromEntries(termNumbers.map((termNumber) => [String(termNumber), 0]));
  }

  return Object.fromEntries(termNumbers.map((termNumber) => [String(termNumber), 0]));
}

async function safeRead<T>(promise: Promise<T>, fallback: T) {
  try {
    return await promise;
  } catch (error) {
    console.error("Unable to read finance data", error);
    return fallback;
  }
}

export default async function FinancePage() {
  const currentUser = await requirePageAccess("finance");
  const year = new Date().getFullYear();

  const [users, families, contributions, payments, gifts, expenses, sponsors, actionPlans, termSettings] = await Promise.all([
    safeRead(
      prisma.user.findMany({
        where: { status: "active" },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          familyMembership: {
            select: {
              familyId: true,
              family: { select: { id: true, name: true, year: true } },
            },
          },
        },
      }),
      [],
    ),
    safeRead(prisma.family.findMany({ orderBy: [{ year: "desc" }, { name: "asc" }], select: { id: true, name: true, year: true } }), []),
    safeRead(
      prisma.contribution.findMany({
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      [],
    ),
    safeRead(
      prisma.payment.findMany({
        orderBy: { paymentDate: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          creator: { select: { id: true, name: true } },
        },
      }),
      [],
    ),
    safeRead(prisma.gift.findMany({ orderBy: { createdAt: "desc" } }), []),
    safeRead(
      prisma.expense.findMany({
        orderBy: { date: "desc" },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true } },
          firstApprover: { select: { id: true, name: true, email: true } },
          secondApprover: { select: { id: true, name: true, email: true } },
        },
      }),
      [],
    ),
    safeRead(
      prisma.sponsor.findMany({
        orderBy: { name: "asc" },
        include: {
          payments: {
            orderBy: { paymentDate: "desc" },
            include: { creator: { select: { id: true, name: true } } },
          },
        },
      }),
      [],
    ),
    safeRead(
      prisma.actionPlan.findMany({
        where: { department: "finance", year },
        orderBy: { createdAt: "desc" },
        include: {
          tasks: {
            orderBy: { createdAt: "desc" },
            include: { assignee: { select: { id: true, name: true } } },
          },
          creator: { select: { id: true, name: true } },
        },
      }),
      [],
    ),
    safeRead(prisma.financeTermSetting.findMany({ orderBy: { currentYear: "desc" } }), []),
  ]);

  return (
    <FinanceClient
      year={year}
      currentUserId={currentUser.id}
      users={users.map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        familyId: item.familyMembership?.familyId ?? null,
        familyName: item.familyMembership?.family?.name ?? null,
        familyYear: item.familyMembership?.family?.year ?? null,
      }))}
      families={families.map((item) => ({
        id: item.id,
        name: item.name,
        year: item.year,
      }))}
      contributions={contributions.map((item) => ({
        id: item.id,
        userId: item.userId,
        userName: item.user.name,
        userEmail: item.user.email,
        year: item.year,
        annualAmount: money(item.annualAmount),
        status: item.status ?? "active",
        notes: item.notes,
      }))}
      payments={payments.map((item) => ({
        id: item.id,
        userId: item.userId,
        userName: item.user?.name ?? "Unknown",
        userEmail: item.user?.email ?? "",
        amount: money(item.amount),
        paymentDateRaw: item.paymentDate.toISOString().slice(0, 10),
        paymentDate: formatDate(item.paymentDate),
        paymentMethod: item.paymentMethod ?? "cash",
        term: item.term,
        year: item.year,
        status: item.status ?? "completed",
        notes: item.notes,
        createdByName: item.creator?.name ?? "System",
        createdAt: item.createdAt.toISOString(),
      }))}
      gifts={gifts.map((item) => ({
        id: item.id,
        donorName: item.donorName,
        commitmentAmount: money(item.commitmentAmount),
        receivedAmount: money(item.receivedAmount),
        giftType: item.giftType,
        status: item.status ?? "pending",
        date: formatDate(item.date),
      }))}
      expenses={expenses.map((item) => ({
        id: item.id,
        category: item.category,
        description: item.description,
        amount: money(item.amount),
        dateRaw: item.date ? item.date.toISOString().slice(0, 10) : "",
        date: formatDate(item.date),
        status: item.status ?? "pending",
        year: item.year ?? (item.date ? item.date.getFullYear() : year),
        createdByName: item.creator?.name ?? "System",
        approvedByName: item.approver?.name ?? null,
        approverId1: item.approverId1,
        approverId2: item.approverId2,
        approver1Name: item.firstApprover?.name ?? null,
        approver2Name: item.secondApprover?.name ?? null,
      }))}
      sponsors={sponsors.map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        phone: item.phone,
        commitmentAmount: money(item.commitmentAmount),
        receivedAmount: item.payments.reduce((sum, payment) => sum + money(payment.amount), 0),
        fundType: item.fundType ?? "one_time",
        status: item.status ?? "active",
        notes: item.notes,
        year: item.year,
        paymentsCount: item.payments.length,
        payments: item.payments.map((payment) => ({
          id: payment.id,
          amount: money(payment.amount),
          paymentDateRaw: payment.paymentDate.toISOString().slice(0, 10),
          paymentDate: formatDate(payment.paymentDate),
          paymentMethod: payment.paymentMethod ?? "cash",
          notes: payment.notes,
          year: payment.year,
          recordedBy: payment.creator?.name ?? "System",
        })),
      }))}
      actionPlans={actionPlans.map((plan) => ({
        id: plan.id,
        title: plan.title,
        description: plan.description,
        startDate: formatDate(plan.startDate),
        startDateRaw: plan.startDate.toISOString().slice(0, 10),
        dueDate: formatDate(plan.dueDate),
        dueDateRaw: plan.dueDate.toISOString().slice(0, 10),
        status: plan.status,
        progress: plan.progress,
        createdByName: plan.creator?.name ?? "Unknown",
        createdAt: formatDate(plan.createdAt),
        tasks: plan.tasks.map((task) => ({
          id: task.id,
          actionPlanId: task.actionPlanId,
          taskName: task.taskName,
          activity: task.activity,
          targetMilestone: task.targetMilestone,
          estimatedBudget: money(task.estimatedBudget),
          startDate: formatDate(task.startDate),
          startDateRaw: task.startDate ? task.startDate.toISOString().slice(0, 10) : "",
          deadline: formatDate(task.deadline),
          deadlineRaw: task.deadline ? task.deadline.toISOString().slice(0, 10) : "",
          progress: task.progress,
          status: task.status,
          assigneeName: task.assignee?.name ?? null,
        })),
      }))}
      termSettings={termSettings
        .filter((setting) => setting.currentYear)
        .map((setting) => {
          const termNumbers = parseNumberArray(
            setting.termNumbers,
            Array.from({ length: setting.numberOfTerms ?? 3 }, (_, index) => index + 1),
          );
          return {
            id: setting.id,
            currentYear: setting.currentYear ?? year,
            numberOfTerms: setting.numberOfTerms ?? termNumbers.length,
            termNumbers,
            termPercentages: parsePercentageMap(setting.termPercentages, termNumbers),
          };
        })}
    />
  );
}
