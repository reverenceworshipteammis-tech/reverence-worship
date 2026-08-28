import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { withDatabaseRetry } from "@/lib/database-retry";
import { prisma } from "@/lib/prisma";

export const ACTION_PLAN_DEPARTMENTS = [
  { value: "music-ministry", label: "Music and Evangelism" },
  { value: "intercession", label: "Intercession and Spiritual" },
  { value: "social-fellowship", label: "Social Fellowship" },
  { value: "discipline", label: "Discipline" },
  { value: "finance", label: "Finance" },
] as const;

export const ACTION_PLAN_STATUSES = ["pending", "in_progress", "completed"] as const;
export const ACTION_PLAN_DEADLINE_FILTERS = ["overdue", "due-soon", "no-deadline"] as const;

export type ActionPlanPortfolioFilters = {
  year: number | null;
  department: string | null;
  status: string | null;
  deadline: string | null;
  query: string;
};

export type ActionPlanPortfolioTask = {
  id: number;
  taskName: string;
  activity: string | null;
  targetMilestone: string | null;
  estimatedBudget: number;
  startDate: Date | null;
  deadline: Date | null;
  priority: string;
  progress: number;
  status: string;
  assigneeName: string | null;
  completed: boolean;
  overdue: boolean;
  dueSoon: boolean;
};

export type ActionPlanPortfolioPlan = {
  id: number;
  title: string;
  description: string | null;
  department: string;
  departmentLabel: string;
  year: number;
  startDate: Date;
  dueDate: Date;
  status: string;
  priority: string;
  progress: number;
  creatorName: string | null;
  createdAt: Date;
  tasks: ActionPlanPortfolioTask[];
  taskCount: number;
  completedTaskCount: number;
  plannedBudget: number;
  overdueTaskCount: number;
  dueSoonTaskCount: number;
};

export type ActionPlanPortfolioSummary = {
  planCount: number;
  completedPlanCount: number;
  taskCount: number;
  completedTaskCount: number;
  overdueTaskCount: number;
  dueSoonTaskCount: number;
  plannedBudget: number;
  progress: number;
};

export type ActionPlanDepartmentSummary = ActionPlanPortfolioSummary & {
  department: string;
  label: string;
};

export type ActionPlanPortfolio = {
  filters: ActionPlanPortfolioFilters;
  availableYears: number[];
  plans: ActionPlanPortfolioPlan[];
  summary: ActionPlanPortfolioSummary & { departmentCount: number };
  departments: ActionPlanDepartmentSummary[];
};

type FilterInput = {
  year?: string | null;
  department?: string | null;
  status?: string | null;
  deadline?: string | null;
  q?: string | null;
};

export function currentKigaliYear() {
  return Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Africa/Kigali" }).format(new Date()));
}

export function normalizeActionPlanPortfolioFilters(input: FilterInput): ActionPlanPortfolioFilters {
  const parsedYear = Number(input.year);
  const year = input.year === "all"
    ? null
    : Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
      ? parsedYear
      : currentKigaliYear();
  const department = ACTION_PLAN_DEPARTMENTS.some((item) => item.value === input.department) ? input.department! : null;
  const status = ACTION_PLAN_STATUSES.some((item) => item === input.status) ? input.status! : null;
  const deadline = ACTION_PLAN_DEADLINE_FILTERS.some((item) => item === input.deadline) ? input.deadline! : null;

  return {
    year,
    department,
    status,
    deadline,
    query: input.q?.trim().slice(0, 100) ?? "",
  };
}

export function actionPlanDepartmentLabel(value: string) {
  return ACTION_PLAN_DEPARTMENTS.find((department) => department.value === value)?.label
    ?? value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function actionPlanStatusLabel(value: string) {
  return value.split(/[_-]/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export async function getActionPlanPortfolio(filters: ActionPlanPortfolioFilters): Promise<ActionPlanPortfolio> {
  const where: Prisma.ActionPlanWhereInput = {
    ...(filters.year === null ? {} : { year: filters.year }),
    ...(filters.department ? { department: filters.department } : {}),
    ...(filters.status ? { status: filters.status === "in_progress" ? { in: ["in_progress", "in-progress"] } : filters.status } : {}),
    ...(filters.query ? {
      OR: [
        { title: { contains: filters.query, mode: "insensitive" } },
        { description: { contains: filters.query, mode: "insensitive" } },
        { creator: { is: { name: { contains: filters.query, mode: "insensitive" } } } },
        { tasks: { some: {
          OR: [
            { taskName: { contains: filters.query, mode: "insensitive" } },
            { activity: { contains: filters.query, mode: "insensitive" } },
            { targetMilestone: { contains: filters.query, mode: "insensitive" } },
            { assignee: { is: { name: { contains: filters.query, mode: "insensitive" } } } },
          ],
        } } },
      ],
    } : {}),
  };

  const [records, yearRows] = await withDatabaseRetry(() => Promise.all([
    prisma.actionPlan.findMany({
      where,
      orderBy: [{ year: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      include: {
        creator: { select: { name: true } },
        tasks: {
          orderBy: [{ deadline: "asc" }, { createdAt: "asc" }],
          include: { assignee: { select: { name: true } } },
        },
      },
    }),
    prisma.actionPlan.findMany({ distinct: ["year"], orderBy: { year: "desc" }, select: { year: true } }),
  ]), 3);

  const todayKey = kigaliDateKey(new Date());
  const dueSoonDate = new Date(`${todayKey}T12:00:00+02:00`);
  dueSoonDate.setUTCDate(dueSoonDate.getUTCDate() + 7);
  const dueSoonKey = kigaliDateKey(dueSoonDate);
  const plans = records.map((plan): ActionPlanPortfolioPlan => {
    const tasks = plan.tasks.map((task): ActionPlanPortfolioTask => {
      const completed = task.status === "completed" || task.progress >= 100;
      const deadlineKey = task.deadline ? dateOnlyKey(task.deadline) : null;
      return {
        id: task.id,
        taskName: task.taskName,
        activity: task.activity,
        targetMilestone: task.targetMilestone,
        estimatedBudget: Number(task.estimatedBudget),
        startDate: task.startDate,
        deadline: task.deadline,
        priority: task.priority,
        progress: task.progress,
        status: task.status,
        assigneeName: task.assignee?.name ?? null,
        completed,
        overdue: Boolean(deadlineKey && deadlineKey < todayKey && !completed),
        dueSoon: Boolean(deadlineKey && deadlineKey >= todayKey && deadlineKey <= dueSoonKey && !completed),
      };
    });
    return {
      id: plan.id,
      title: plan.title,
      description: plan.description,
      department: plan.department,
      departmentLabel: actionPlanDepartmentLabel(plan.department),
      year: plan.year,
      startDate: plan.startDate,
      dueDate: plan.dueDate,
      status: plan.status,
      priority: plan.priority,
      progress: plan.progress,
      creatorName: plan.creator?.name ?? null,
      createdAt: plan.createdAt,
      tasks,
      taskCount: tasks.length,
      completedTaskCount: tasks.filter((task) => task.completed).length,
      plannedBudget: tasks.reduce((sum, task) => sum + task.estimatedBudget, 0),
      overdueTaskCount: tasks.filter((task) => task.overdue).length,
      dueSoonTaskCount: tasks.filter((task) => task.dueSoon).length,
    };
  }).filter((plan) => {
    if (filters.deadline === "overdue") return plan.tasks.some((task) => task.overdue);
    if (filters.deadline === "due-soon") return plan.tasks.some((task) => task.dueSoon);
    if (filters.deadline === "no-deadline") return plan.tasks.length === 0 || plan.tasks.some((task) => !task.deadline);
    return true;
  });

  const departmentValues = filters.department
    ? [filters.department]
    : Array.from(new Set([...ACTION_PLAN_DEPARTMENTS.map((department) => department.value), ...plans.map((plan) => plan.department)]));
  const departments = departmentValues.map((department) => ({
    department,
    label: actionPlanDepartmentLabel(department),
    ...summarizePlans(plans.filter((plan) => plan.department === department)),
  }));
  const summary = summarizePlans(plans);

  return {
    filters,
    availableYears: Array.from(new Set([currentKigaliYear(), ...yearRows.map((row) => row.year)])).sort((first, second) => second - first),
    plans,
    departments,
    summary: {
      ...summary,
      departmentCount: new Set(plans.map((plan) => plan.department)).size,
    },
  };
}

function summarizePlans(plans: ActionPlanPortfolioPlan[]): ActionPlanPortfolioSummary {
  const tasks = plans.flatMap((plan) => plan.tasks);
  const progressValues = tasks.length ? tasks.map((task) => task.progress) : plans.map((plan) => plan.progress);
  return {
    planCount: plans.length,
    completedPlanCount: plans.filter((plan) => plan.status === "completed" || plan.progress >= 100).length,
    taskCount: tasks.length,
    completedTaskCount: tasks.filter((task) => task.completed).length,
    overdueTaskCount: tasks.filter((task) => task.overdue).length,
    dueSoonTaskCount: tasks.filter((task) => task.dueSoon).length,
    plannedBudget: tasks.reduce((sum, task) => sum + task.estimatedBudget, 0),
    progress: progressValues.length ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length) : 0,
  };
}

function dateOnlyKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function kigaliDateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Kigali", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}
