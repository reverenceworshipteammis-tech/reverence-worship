import { notFound } from "next/navigation";
import { IntercessionSubmissionsClient } from "@/components/intercession-submissions-client";
import { getUserPermissionSet, permissionSetHas, requireAnyPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseIntercessionFormSettings, parseIntercessionVisitorDetails } from "@/lib/intercession-form-domain";
import { normalizeIntercessionResponseValue } from "@/lib/intercession-response-summary";
import { intercessionAnswerForQuestion, intercessionAnswerText, intercessionResponseQuestionCatalog, intercessionSubmissionQuestions } from "@/lib/intercession-response-data";

const INTERCESSION_TIME_ZONE = "Africa/Kigali";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: INTERCESSION_TIME_ZONE,
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: INTERCESSION_TIME_ZONE,
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: INTERCESSION_TIME_ZONE,
  }).format(date);
}

function manualGradeFor(value: unknown, questionIndex: number) {
  if (!Array.isArray(value)) return null;
  const grade = value.find((item) => {
    if (!item || typeof item !== "object") return false;
    return Number((item as Record<string, unknown>).questionIndex) === questionIndex;
  });
  if (!grade || typeof grade !== "object") return null;
  return Boolean((grade as Record<string, unknown>).correct);
}

function earnedPointsFor(value: unknown, questionIndex: number) {
  if (!Array.isArray(value)) return null;
  const grade = value.find((item) => item && typeof item === "object" && Number((item as Record<string, unknown>).questionIndex) === questionIndex);
  if (!grade || typeof grade !== "object") return null;
  const record = grade as Record<string, unknown>;
  const earned = Number(record.earnedPoints);
  if (Number.isFinite(earned)) return Math.round(earned * 100) / 100;
  return record.correct ? Number(record.points ?? 1) : 0;
}

function totalEarnedPoints(value: unknown) {
  if (!Array.isArray(value)) return null;
  return Math.round(value.reduce((sum, item) => {
    if (!item || typeof item !== "object") return sum;
    const grade = item as Record<string, unknown>;
    const earned = Number(grade.earnedPoints);
    return sum + (Number.isFinite(earned) ? earned : grade.correct ? Number(grade.points ?? 1) : 0);
  }, 0) * 100) / 100;
}

export default async function IntercessionFormSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAnyPermission("intercession", ["view-submissions", "view-results"], "/admin/intercession");
  const permissions = await getUserPermissionSet(user);
  const { id } = await params;
  const formId = Number(id);

  if (!Number.isFinite(formId)) {
    notFound();
  }

  const form = await prisma.spiritualForm.findUnique({
    where: { id: formId },
    include: {
      submissions: {
        orderBy: { submittedAt: "desc" },
        include: {
          user: {
            select: { name: true },
          },
        },
      },
      summaryShares: {
        where: { revokedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, expiresAt: true, createdAt: true },
      },
    },
  });

  if (!form) {
    notFound();
  }
  const activity = (await prisma.activityLog.findMany({ where: { module: "intercession" }, orderBy: { createdAt: "desc" }, take: 200, include: { user: { select: { name: true } } } }))
    .filter((entry) => Number((entry.metadata as Record<string, unknown> | null)?.formId) === formId)
    .slice(0, 30);

  const settings = parseIntercessionFormSettings(form.settings);
  const releaseGrade = settings.release_grade;
  const isQuiz = settings.is_quiz;
  const reviewQuestions = intercessionResponseQuestionCatalog(form.questions, form.submissions.map((submission) => submission.questionSnapshot))
    .map((question, catalogIndex) => ({
      id: question.id,
      index: catalogIndex,
      label: question.label || `Question ${catalogIndex + 1}`,
      type: question.type,
      points: question.points,
      images: question.images,
      options: question.options,
      rows: question.rows,
      columns: question.columns,
      min: question.min,
      max: question.max,
    }))
    .filter((question) => question.type !== "title_section" && question.type !== "section_break");

  return (
    <IntercessionSubmissionsClient
      form={{
        id: form.id,
        title: form.title,
        description: form.description,
        version: form.version,
        isActive: form.isActive,
        isPublished: settings.is_published,
        acceptingResponses: settings.accepting_responses,
        requireLogin: settings.require_login,
        notifyOnSubmit: settings.notify_on_submit,
        sendResponseReceipt: settings.send_response_receipt,
        allowResponseEditing: settings.allow_response_editing,
        responseEditHours: settings.response_edit_hours,
        responseClosedMessage: settings.response_closed_message,
        canManageResponses: permissionSetHas(permissions, "intercession", "manage-forms") || permissionSetHas(permissions, "intercession", "edit-forms"),
        activeSummaryShares: form.summaryShares.map((share) => ({ id: share.id, expiresAt: share.expiresAt?.toISOString() ?? null, createdAt: share.createdAt.toISOString() })),
        summaryQuestions: reviewQuestions.map((question) => ({ id: question.id, label: question.label })),
        responseActivity: activity.map((entry) => ({ id: entry.id, action: entry.action, actor: entry.user?.name ?? "System / respondent", createdAt: formatDateTime(entry.createdAt) })),
        isQuiz,
        releaseGrade,
        canDeleteSubmissions: permissionSetHas(permissions, "intercession", "delete-forms"),
        canGradeSubmissions: permissionSetHas(permissions, "intercession", "view-results"),
        allowExport: settings.allow_export,
        includeTimestamps: settings.include_timestamps,
        exportQuestions: reviewQuestions.map((question) => ({ questionId: question.id, questionIndex: question.index, question: question.label })),
        analyticsQuestions: reviewQuestions.map((question) => ({
          questionId: question.id,
          questionIndex: question.index,
          label: question.label,
          type: question.type,
          options: question.options,
          rows: question.rows,
          columns: question.columns,
          min: question.min,
          max: question.max,
        })),
      }}
      submissions={form.submissions.map((submission) => {
        const submissionQuestions = intercessionSubmissionQuestions(submission.questionSnapshot, form.questions);
        const visitorDetails = parseIntercessionVisitorDetails(submission.respondentDetails).filter((detail) => detail.type !== "email");
        const visibleReviewQuestions = reviewQuestions.flatMap((catalogQuestion) => {
          const questionIndex = submissionQuestions.findIndex((question) => question.id === catalogQuestion.id);
          if (questionIndex < 0) return [];
          const question = submissionQuestions[questionIndex];
          const value = intercessionAnswerForQuestion(submission.answers, submissionQuestions, question.id);
          return value === null ? [] : [{ ...catalogQuestion, ...question, questionIndex, value }];
        });
        const totalPoints = visibleReviewQuestions.reduce((sum, question) => sum + (question.type === "file_upload" ? 0 : Number.isFinite(question.points) && question.points > 0 ? question.points : 1), 0);
        return {
          id: submission.id,
          memberName: submission.user?.name ?? submission.respondentName ?? "Anonymous guest",
          respondentType: submission.user ? "Member" : "Guest",
          visitorDetails,
          submittedAt: formatDateTime(submission.submittedAt),
          submittedAtIso: submission.submittedAt.toISOString(),
          submittedDate: formatDate(submission.submittedAt),
          submittedTime: formatTime(submission.submittedAt),
          score: submission.score,
          earnedPoints: submission.score === null ? null : totalEarnedPoints(submission.manualGrades) ?? 0,
          totalPoints: Math.round(totalPoints * 100) / 100,
          isReleased: submission.isReleased,
          reviewedAt: submission.reviewedAt ? formatDateTime(submission.reviewedAt) : null,
          deletedAt: submission.deletedAt ? formatDateTime(submission.deletedAt) : null,
          formVersion: submission.formVersion,
          completionSeconds: submission.completionSeconds,
          releasedAt: submission.releasedAt ? formatDateTime(submission.releasedAt) : null,
          answers: visibleReviewQuestions.map((question) => ({
            questionId: question.id,
            questionIndex: question.questionIndex,
            question: question.label,
            type: question.type,
            points: Number.isFinite(question.points) && question.points > 0 ? question.points : 1,
            images: question.images,
            answer: intercessionAnswerText(question.value),
            responseValue: normalizeIntercessionResponseValue(question.value),
            correct: manualGradeFor(submission.manualGrades, question.questionIndex),
            earnedPoints: earnedPointsFor(submission.manualGrades, question.questionIndex),
          })),
        };
      })}
    />
  );
}
