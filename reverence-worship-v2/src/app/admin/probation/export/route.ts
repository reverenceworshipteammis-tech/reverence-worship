import { NextResponse } from "next/server";
import { getCurrentUser, getUserPermissionSet, permissionSetHas } from "@/lib/auth";
import { getProbationMonitoringBatch, probationDateSummary } from "@/lib/probation-data";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const permissions = await getUserPermissionSet(user);
  if (!permissionSetHas(permissions, "probation", "export")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const probations = await prisma.probation.findMany({
    orderBy: [{ state: "asc" }, { currentExpectedEndDate: "asc" }],
    include: {
      member: { select: { name: true, status: true } },
      extensions: { select: { id: true } },
      decisionRequests: { where: { status: "pending" }, select: { requestedState: true } },
    },
  });

  const header = [
    "Member",
    "Account Status",
    "Probation State",
    "Original Start",
    "Original Expected End",
    "Current Expected End",
    "Days Remaining",
    "Review Overdue",
    "Attendance %",
    "Present",
    "Attendance Records",
    "Communication %",
    "Communicated Absences",
    "Uncommunicated Absences",
    "Discipline %",
    "Positive Discipline",
    "Negative Discipline",
    "Unresolved Discipline",
    "Permission Approved",
    "Permission Rejected",
    "Permission Pending",
    "Extensions",
    "Pending Decision",
    "Needs Attention",
  ];

  const lines = [header.map(csvCell).join(",")];
  const monitoringByProbation = await getProbationMonitoringBatch(probations);
  for (const probation of probations) {
    const monitoring = monitoringByProbation.get(probation.id)!;
    const dates = probationDateSummary(probation.currentExpectedEndDate);
    lines.push([
      probation.member.name,
      probation.member.status,
      probation.state,
      probation.originalStartDate.toISOString().slice(0, 10),
      probation.originalExpectedEndDate.toISOString().slice(0, 10),
      probation.currentExpectedEndDate.toISOString().slice(0, 10),
      dates.daysRemaining,
      dates.isOverdue && (probation.state === "active" || probation.state === "extended") ? "Yes" : "No",
      monitoring.attendance.rate,
      monitoring.attendance.present,
      monitoring.attendance.total,
      monitoring.communication.rate,
      monitoring.communication.communicated,
      monitoring.communication.uncommunicated,
      monitoring.discipline.rate,
      monitoring.discipline.positive,
      monitoring.discipline.negative,
      monitoring.discipline.unresolved,
      monitoring.permissions.approved,
      monitoring.permissions.rejected,
      monitoring.permissions.pending,
      probation.extensions.length,
      probation.decisionRequests[0]?.requestedState ?? "",
      monitoring.needsAttention ? "Yes" : "No",
    ].map(csvCell).join(","));
  }

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="probation-report-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
