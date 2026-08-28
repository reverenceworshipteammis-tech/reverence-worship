import { NextResponse } from "next/server";
import { getCurrentUser, getUserPermissionSet, permissionSetHas } from "@/lib/auth";
import { ACTION_PLAN_TASK_TEMPLATE_HEADERS } from "@/lib/action-plan-task-import";
import { actionPlanDepartmentLabel } from "@/lib/action-plan-portfolio";
import { prisma } from "@/lib/prisma";
import { createXlsxWorkbook, type XlsxCell } from "@/lib/xlsx-workbook";

export const runtime = "nodejs";

const DEPARTMENT_PAGES: Record<string, string> = {
  "music-ministry": "music-ministry",
  intercession: "intercession",
  "social-fellowship": "social-fellowship",
  discipline: "discipline",
  finance: "finance",
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: idValue } = await context.params;
  const id = Number(idValue);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Action plan not found" }, { status: 404 });

  const plan = await prisma.actionPlan.findUnique({ where: { id }, select: { id: true, title: true, department: true, year: true } });
  if (!plan) return NextResponse.json({ error: "Action plan not found" }, { status: 404 });
  const page = DEPARTMENT_PAGES[plan.department];
  const permissions = await getUserPermissionSet(user);
  if (!page || !permissionSetHas(permissions, page, "manage-action-plans")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const instructions: XlsxCell[][] = [
    ["Action Plan Task Import Instructions", "Value"],
    ["Department", actionPlanDepartmentLabel(plan.department)],
    ["Action plan", plan.title],
    ["Year", plan.year],
    ["How to use", "Fill one task per row on the Tasks sheet, save as .xlsx, then use Import tasks on this action plan."],
    ["Required fields", "Activity, Target / Milestone, Deadline"],
    ["Dates", "Use YYYY-MM-DD, for example 2026-10-31."],
    ["Budget", "Enter a non-negative number in RWF. Leave blank for 0."],
    ["Priority", "Use low, medium, or high. Leave blank for medium."],
    ["Progress", "Enter a whole number from 0 to 100. Leave blank for 0."],
    ["Import behavior", "New tasks are appended. Existing tasks with the same activity, milestone, and deadline are skipped."],
    ["Maximum", "500 tasks and 2 MB per import file."],
  ];
  const workbook = await createXlsxWorkbook([
    { name: "Tasks", rows: [[...ACTION_PLAN_TASK_TEMPLATE_HEADERS]], widths: [40, 45, 24, 25, 25, 28, 20] },
    { name: "Instructions", rows: instructions, autoFilter: false, widths: [24, 90] },
  ]);
  const body = workbook.buffer.slice(workbook.byteOffset, workbook.byteOffset + workbook.byteLength) as ArrayBuffer;
  const filename = `${safeFilename(plan.title)}-task-template.xlsx`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function safeFilename(value: string) {
  const filename = value.normalize("NFKD").replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
  return filename || "action-plan";
}
