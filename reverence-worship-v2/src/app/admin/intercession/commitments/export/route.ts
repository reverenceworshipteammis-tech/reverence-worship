import { requirePermission } from "@/lib/auth";
import { loadCommitmentReports } from "@/lib/membership-commitment-service";
import { createXlsxWorkbook, type XlsxCell } from "@/lib/xlsx-workbook";
import { createReportPdf } from "@/lib/simple-pdf";
import { membershipTypeLabel } from "@/lib/membership-types";
import { commitmentProfileDisplay, parseCommitmentChanges, type CommitmentSnapshot } from "@/lib/membership-commitment";
import { prisma } from "@/lib/prisma";
import { parseIntercessionFormQuestions } from "@/lib/intercession-form-domain";
import { intercessionAnswerForQuestion, intercessionAnswerText } from "@/lib/intercession-response-data";
import { intercessionRichTextToPlainText } from "@/lib/intercession-rich-text";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await requirePermission("intercession", "export-reports", "/admin/intercession");
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year"));
  if (!Number.isInteger(year) || year < 2000 || year > 2200) return new Response("Select a valid commitment year.", { status: 400 });
  const report = await loadCommitmentReports(year);
  if (report.year !== year) return new Response("Commitment year not found.", { status: 404 });
  const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const status = url.searchParams.get("status") ?? "all";
  const rows = report.rows.filter((row) => (!query || row.name.toLowerCase().includes(query)) && (status === "all" || row.status.toLowerCase() === status));
  const date = (value: string | null) => value ? new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Kigali", dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "";
  const headers = { "Cache-Control": "private, no-store" };
  const accepted = rows.filter((row) => row.status === "Accepted").length;
  if (url.searchParams.get("format") === "pdf") {
    const pdf = createReportPdf({ title: `Commitments ${year}`, subtitle: `Members: ${rows.length} | Accepted: ${accepted} | Pending: ${rows.length - accepted}`, landscape: true, columns: [{ label: "Member", width: 30 }, { label: "Year", width: 8 }, { label: "Status", width: 12 }, { label: "Submitted (Kigali)", width: 24 }, { label: "Profile changes", width: 26 }], rows: rows.map((row) => [row.name, year, row.status, date(row.acceptedAt), row.changes ? `${row.changes} updated` : "-"]) });
    await prisma.activityLog.create({ data: { userId: user.id, action: "membership.commitment.exported-pdf", module: "intercession", metadata: { year, records: rows.length } } });
    return new Response(new Uint8Array(pdf), { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="membership-commitments-${year}.pdf"` } });
  }
  const records = await prisma.membershipCommitment.findMany({ where: { id: { in: rows.flatMap((row) => row.commitmentId ? [row.commitmentId] : []) } } });
  const profileRows: XlsxCell[][] = [["Member", "Year", "Field", "Confirmed value"]];
  const changeRows: XlsxCell[][] = [["Member", "Year", "Field", "Previous value", "Updated value", "Update status"]];
  const evidenceRows: XlsxCell[][] = [["Member", "Year", "Submitted (Kigali)", "Form version", "Acceptance statement", "Terms part", "Accepted terms"]];
  const answerRows: XlsxCell[][] = [["Member", "Year", "Question", "Answer part", "Submitted answer"]];
  const chunks = (value: string) => value.match(/[\s\S]{1,30000}/g) ?? [""];
  for (const record of records) {
    const snapshot = record.snapshot as unknown as CommitmentSnapshot;
    for (const field of snapshot.profile) profileRows.push([snapshot.memberName, year, field.label, commitmentProfileDisplay(field.key, field.value)]);
    for (const change of parseCommitmentChanges(record.profileChanges)) changeRows.push([snapshot.memberName, year, change.label, commitmentProfileDisplay(change.key, change.before), commitmentProfileDisplay(change.key, change.after), "Applied on submission"]);
    chunks(intercessionRichTextToPlainText(snapshot.terms)).forEach((part, index) => evidenceRows.push([snapshot.memberName, year, date(record.acceptedAt.toISOString()), record.formVersion, snapshot.acceptanceLabel || "Form submitted", index + 1, part]));
    const questions = parseIntercessionFormQuestions(snapshot.questions);
    questions.forEach((question, index) => {
      if (!Object.prototype.hasOwnProperty.call(snapshot.answers, `question_${index}`)) return;
      const answer = intercessionAnswerText(intercessionAnswerForQuestion(snapshot.answers, questions, question.id));
      chunks(answer).forEach((part, partIndex) => answerRows.push([snapshot.memberName, year, intercessionRichTextToPlainText(question.label), partIndex + 1, part]));
    });
  }
  const workbook = await createXlsxWorkbook([
    { name: "Commitment status", rows: [["Member", "Membership type", "Year", "Commitment status", "Submitted (Kigali)"], ...rows.map((row) => [row.name, membershipTypeLabel(row.membershipType), year, row.status, date(row.acceptedAt)])], autoFilter: true },
    { name: "Confirmed information", rows: profileRows, autoFilter: true }, { name: "Profile changes", rows: changeRows, autoFilter: true },
    { name: "Acceptance evidence", rows: evidenceRows, autoFilter: true }, { name: "Submitted answers", rows: answerRows, autoFilter: true },
    { name: "Overview", rows: [["Year", year], ["Expected members", report.rows.length], ["Accepted", report.rows.filter((row) => row.status === "Accepted").length], ["Exported members", rows.length]], autoFilter: false },
  ]);
  await prisma.activityLog.create({ data: { userId: user.id, action: "membership.commitment.exported-xlsx", module: "intercession", metadata: { year, records: rows.length } } });
  return new Response(new Uint8Array(workbook), { headers: { ...headers, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="membership-commitments-${year}.xlsx"` } });
}
