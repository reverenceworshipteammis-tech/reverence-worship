import { requireAnyPermission } from "@/lib/auth";
import { intercessionScoreMarks, parseIntercessionFormSettings, parseIntercessionVisitorDetails } from "@/lib/intercession-form-domain";
import { intercessionAnswerForQuestion, intercessionAnswerText, intercessionResponseQuestionCatalog, intercessionSubmissionQuestions } from "@/lib/intercession-response-data";
import { intercessionRichTextToPlainText } from "@/lib/intercession-rich-text";
import { prisma } from "@/lib/prisma";
import { createXlsxWorkbook, type XlsxCell } from "@/lib/xlsx-workbook";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAnyPermission("intercession", ["view-submissions", "view-results"], "/admin/forms");
  const formId = Number((await params).id);
  if (!Number.isInteger(formId) || formId <= 0) return new Response("Invalid form.", { status: 400 });
  const form = await prisma.spiritualForm.findUnique({
    where: { id: formId },
    include: { submissions: { orderBy: [{ submittedAt: "asc" }, { id: "asc" }], include: { user: { select: { name: true } } } } },
  });
  if (!form) return new Response("Form not found.", { status: 404 });
  const settings = parseIntercessionFormSettings(form.settings);
  if (!settings.allow_export) return new Response("Response export is disabled for this form.", { status: 403 });

  const catalog = intercessionResponseQuestionCatalog(form.questions, form.submissions.map((submission) => submission.questionSnapshot));
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const nameFilter = url.searchParams.get("name")?.trim().toLowerCase() ?? "";
  const status = url.searchParams.get("status") ?? "active";
  const respondentType = url.searchParams.get("type") ?? "all";
  const scoreFilter = url.searchParams.get("score") ?? "all";
  const releaseFilter = url.searchParams.get("release") ?? "all";
  const reviewFilter = url.searchParams.get("review") ?? "all";
  const questionFilter = url.searchParams.get("question") ?? "";
  const answerFilter = url.searchParams.get("answer")?.trim().toLowerCase() ?? "";
  const selectedIds = new Set((url.searchParams.get("ids") ?? "").split(",").map(Number).filter((id) => Number.isInteger(id) && id > 0).slice(0, 500));
  const dateFrom = parseDate(url.searchParams.get("from"), false);
  const dateTo = parseDate(url.searchParams.get("to"), true);

  const prepared = form.submissions.map((submission) => {
    const questions = intercessionSubmissionQuestions(submission.questionSnapshot, form.questions);
    const visitorDetails = parseIntercessionVisitorDetails(submission.respondentDetails).filter((detail) => detail.type !== "email");
    const answers = catalog.map((question) => ({
      questionId: question.id,
      value: intercessionAnswerForQuestion(submission.answers, questions, question.id),
    }));
    return {
      submission,
      name: submission.user?.name ?? submission.respondentName ?? "Anonymous guest",
      type: submission.user ? "Member" : "Guest",
      visitorDetails,
      answers,
    };
  }).filter((row) => {
    if (status === "active" && row.submission.deletedAt || status === "trash" && !row.submission.deletedAt) return false;
    if (selectedIds.size && !selectedIds.has(row.submission.id)) return false;
    if (respondentType !== "all" && row.type.toLowerCase() !== respondentType) return false;
    const score = row.submission.score ?? 0;
    if (scoreFilter === "high" && score < 80 || scoreFilter === "medium" && (score < 60 || score >= 80) || scoreFilter === "low" && (score < 40 || score >= 60) || scoreFilter === "fail" && score >= 40 || scoreFilter === "unscored" && row.submission.score !== null) return false;
    if (releaseFilter === "released" && !row.submission.isReleased || releaseFilter === "pending" && row.submission.isReleased) return false;
    if (reviewFilter === "reviewed" && !row.submission.reviewedAt || reviewFilter === "pending" && row.submission.reviewedAt) return false;
    if (dateFrom && row.submission.submittedAt < dateFrom || dateTo && row.submission.submittedAt > dateTo) return false;
    if (nameFilter && !row.name.toLowerCase().includes(nameFilter)) return false;
    if (query) {
      const searchable = [row.name, ...row.visitorDetails.flatMap((detail) => Array.isArray(detail.value) ? detail.value : [detail.value]), ...row.answers.map((answer) => intercessionAnswerText(answer.value))].join(" ").toLowerCase();
      if (!searchable.includes(query)) return false;
    }
    if (questionFilter) {
      const selected = row.answers.find((answer) => answer.questionId === questionFilter)?.value ?? null;
      if (!intercessionAnswerText(selected).trim()) return false;
    }
    if (answerFilter) {
      const selected = questionFilter ? row.answers.find((answer) => answer.questionId === questionFilter)?.value ?? null : null;
      const searchable = questionFilter ? intercessionAnswerText(selected) : row.answers.map((answer) => intercessionAnswerText(answer.value)).join(" ");
      if (!searchable.toLowerCase().includes(answerFilter)) return false;
    }
    return true;
  });

  const visitorColumns = Array.from(new Map(prepared.flatMap((row) => row.visitorDetails.map((detail) => [detail.fieldId, detail.label] as const))).entries());
  const responseHeader: XlsxCell[] = ["No.", "Responder", "Type", ...visitorColumns.map(([, label]) => label), ...(settings.include_timestamps ? ["Submitted"] : []), ...catalog.map((question, index) => `Q${index + 1}: ${plain(question.label)}`), ...(settings.is_quiz ? ["Score"] : [])];
  const responseRows: XlsxCell[][] = prepared.map((row, index) => [
    index + 1,
    row.name,
    row.type,
    ...visitorColumns.map(([fieldId]) => {
      const value = row.visitorDetails.find((detail) => detail.fieldId === fieldId)?.value;
      return Array.isArray(value) ? value.join(", ") : value ?? "";
    }),
    ...(settings.include_timestamps ? [row.submission.submittedAt] : []),
    ...catalog.map((question) => intercessionAnswerText(row.answers.find((answer) => answer.questionId === question.id)?.value ?? null)),
    ...(settings.is_quiz ? [row.submission.score === null ? null : intercessionScoreMarks(row.submission.manualGrades)] : []),
  ]);

  const workbook = await createXlsxWorkbook([
    { name: "Responses", rows: [responseHeader, ...responseRows], autoFilter: true },
  ]);
  await prisma.activityLog.create({ data: { userId: user.id, action: "intercession.responses.exported-xlsx", module: "intercession", metadata: { formId, responseCount: prepared.length } } });
  const filename = `${plain(form.title).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60) || `form-${formId}`}-responses.xlsx`;
  const body = workbook.buffer.slice(workbook.byteOffset, workbook.byteOffset + workbook.byteLength) as ArrayBuffer;
  return new Response(body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function parseDate(value: string | null, endOfDay: boolean) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}+02:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function plain(value: string) {
  return intercessionRichTextToPlainText(value).replace(/\s+/g, " ").trim();
}
