import { NextResponse } from "next/server";
import { getCurrentUser, getUserPermissionSet, permissionSetHas } from "@/lib/auth";
import {
  actionPlanStatusLabel,
  getActionPlanPortfolio,
  normalizeActionPlanPortfolioFilters,
} from "@/lib/action-plan-portfolio";
import { prisma } from "@/lib/prisma";
import { createXlsxWorkbook, xlsxPercentage, type XlsxCell } from "@/lib/xlsx-workbook";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const permissions = await getUserPermissionSet(user);
  if (!permissionSetHas(permissions, "reports", "export")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const search = new URL(request.url).searchParams;
  const filters = normalizeActionPlanPortfolioFilters({
    year: search.get("year"),
    department: search.get("department"),
    status: search.get("status"),
    deadline: search.get("deadline"),
    q: search.get("q"),
  });
  const portfolio = await getActionPlanPortfolio(filters);
  const yearLabel = filters.year === null ? "All years" : String(filters.year);
  const departmentLabel = filters.department
    ? portfolio.departments[0]?.label ?? filters.department
    : "All departments";

  const overviewRows: XlsxCell[][] = [
    ["Metric", "Value"],
    ["Report", "Consolidated Action Plans"],
    ["Year", yearLabel],
    ["Department", departmentLabel],
    ["Plan status", filters.status ? actionPlanStatusLabel(filters.status) : "All statuses"],
    ["Deadline filter", filters.deadline ? actionPlanStatusLabel(filters.deadline) : "All deadlines"],
    ["Search", filters.query || "None"],
    ["Departments represented", portfolio.summary.departmentCount],
    ["Action plans", portfolio.summary.planCount],
    ["Completed action plans", portfolio.summary.completedPlanCount],
    ["Tasks", portfolio.summary.taskCount],
    ["Completed tasks", portfolio.summary.completedTaskCount],
    ["Overdue tasks", portfolio.summary.overdueTaskCount],
    ["Tasks due within 7 days", portfolio.summary.dueSoonTaskCount],
    ["Overall progress", xlsxPercentage(portfolio.summary.progress)],
    ["Total planned budget (RWF)", portfolio.summary.plannedBudget],
    ["Exported at", new Date()],
    ["Exported by", user.name],
  ];
  const departmentRows: XlsxCell[][] = [
    ["Department", "Plans", "Completed Plans", "Tasks", "Completed Tasks", "Progress", "Overdue Tasks", "Due Within 7 Days", "Planned Budget (RWF)"],
    ...portfolio.departments.map((department): XlsxCell[] => [
      department.label,
      department.planCount,
      department.completedPlanCount,
      department.taskCount,
      department.completedTaskCount,
      xlsxPercentage(department.progress),
      department.overdueTaskCount,
      department.dueSoonTaskCount,
      department.plannedBudget,
    ]),
    [
      "Total",
      portfolio.summary.planCount,
      portfolio.summary.completedPlanCount,
      portfolio.summary.taskCount,
      portfolio.summary.completedTaskCount,
      xlsxPercentage(portfolio.summary.progress),
      portfolio.summary.overdueTaskCount,
      portfolio.summary.dueSoonTaskCount,
      portfolio.summary.plannedBudget,
    ],
  ];
  const planRows: XlsxCell[][] = [[
    "No.", "Department", "Year", "Action Plan", "Description", "Status", "Priority", "Start Date", "Due Date", "Progress", "Tasks", "Completed Tasks", "Overdue Tasks", "Planned Budget (RWF)", "Created By",
  ]];
  portfolio.plans.forEach((plan, index) => planRows.push([
    index + 1,
    plan.departmentLabel,
    plan.year,
    plan.title,
    plan.description ?? "",
    actionPlanStatusLabel(plan.status),
    actionPlanStatusLabel(plan.priority),
    plan.startDate,
    plan.dueDate,
    xlsxPercentage(plan.progress),
    plan.taskCount,
    plan.completedTaskCount,
    plan.overdueTaskCount,
    plan.plannedBudget,
    plan.creatorName ?? "",
  ]));
  const taskRows: XlsxCell[][] = [[
    "No.", "Department", "Action Plan", "Activity", "Task Name", "Target / Milestone", "Assignee", "Status", "Priority", "Progress", "Start Date", "Deadline", "Deadline Health", "Estimated Budget (RWF)",
  ]];
  let taskNumber = 0;
  portfolio.plans.forEach((plan) => plan.tasks.forEach((task) => {
    taskNumber += 1;
    taskRows.push([
      taskNumber,
      plan.departmentLabel,
      plan.title,
      task.activity ?? task.taskName,
      task.taskName,
      task.targetMilestone ?? "",
      task.assigneeName ?? "Unassigned",
      actionPlanStatusLabel(task.completed ? "completed" : task.status),
      actionPlanStatusLabel(task.priority),
      xlsxPercentage(task.progress),
      task.startDate,
      task.deadline,
      task.overdue ? "Overdue" : task.dueSoon ? "Due within 7 days" : task.deadline ? "On schedule" : "No deadline",
      task.estimatedBudget,
    ]);
  }));

  const workbook = await createXlsxWorkbook([
    { name: "Overview", rows: overviewRows, autoFilter: false, widths: [32, 42] },
    { name: "Departments", rows: departmentRows, autoFilter: true },
    { name: "Action Plans", rows: planRows, autoFilter: true },
    { name: "Tasks", rows: taskRows, autoFilter: true },
  ]);
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: "reports.action-plans.exported-xlsx",
      module: "reports",
      metadata: {
        year: filters.year,
        department: filters.department,
        status: filters.status,
        deadline: filters.deadline,
        planCount: portfolio.summary.planCount,
        taskCount: portfolio.summary.taskCount,
      },
    },
  });
  const suffix = filters.year === null ? "all-years" : String(filters.year);
  const body = workbook.buffer.slice(workbook.byteOffset, workbook.byteOffset + workbook.byteLength) as ArrayBuffer;
  return new Response(body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="consolidated-action-plans-${suffix}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
