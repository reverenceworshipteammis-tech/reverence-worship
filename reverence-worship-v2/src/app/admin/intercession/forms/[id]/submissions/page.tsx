import { notFound } from "next/navigation";
import { IntercessionSubmissionsClient } from "@/components/intercession-submissions-client";
import { getUserPermissionSet, permissionSetHas, requireAnyPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseQuestionImages } from "@/lib/intercession-question-images";
import { parseIntercessionFormQuestions, parseIntercessionVisitorDetails, visibleIntercessionQuestions, type IntercessionFormAnswer } from "@/lib/intercession-form-domain";

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

function parseObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function parseQuestions(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
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

function answerText(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => {
        const row = key.replace(/^question_\d+_/, "Row ");
        return `${row}: ${answerText(item)}`;
      })
      .join("; ");
  }
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
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
            select: { name: true, email: true },
          },
        },
      },
    },
  });

  if (!form) {
    notFound();
  }

  const settings = parseObject(form.settings);
  const questions = parseQuestions(form.questions);
  const domainQuestions = parseIntercessionFormQuestions(form.questions);
  const releaseGrade = String(settings.release_grade ?? "immediately");
  const isQuiz = Boolean(settings.is_quiz);
  const reviewQuestions = questions
    .map((question, index) => ({
      index,
      label: String(question.label ?? question.title ?? `Question ${index + 1}`),
      type: String(question.type ?? "short_answer"),
      points: Number(question.points ?? 1),
      images: parseQuestionImages(question.images),
    }))
    .filter((question) => question.type !== "title_section" && question.type !== "section_break");

  return (
    <IntercessionSubmissionsClient
      form={{
        id: form.id,
        title: form.title,
        description: form.description,
        isQuiz,
        releaseGrade,
        canDeleteSubmissions: permissionSetHas(permissions, "intercession", "delete-forms"),
        canGradeSubmissions: permissionSetHas(permissions, "intercession", "view-results"),
        allowExport: settings.allow_export !== false,
        includeTimestamps: settings.include_timestamps !== false,
        exportQuestions: reviewQuestions.map((question) => ({ questionIndex: question.index, question: question.label })),
      }}
      submissions={form.submissions.map((submission) => {
        const answers = parseObject(submission.answers);
        const visitorDetails = parseIntercessionVisitorDetails(submission.respondentDetails);
        const visitorEmail = visitorDetails.find((detail) => detail.type === "email");
        const answersByQuestionId = Object.fromEntries(domainQuestions.map((question, index) => [question.id, answers[`question_${index}`] as IntercessionFormAnswer]));
        const visibleIndexes = new Set(visibleIntercessionQuestions(domainQuestions, answersByQuestionId).map((item) => item.index));
        const visibleReviewQuestions = reviewQuestions.filter((question) => visibleIndexes.has(question.index));
        const totalPoints = visibleReviewQuestions.reduce((sum, question) => sum + (question.type === "file_upload" ? 0 : Number.isFinite(question.points) && question.points > 0 ? question.points : 1), 0);
        return {
          id: submission.id,
          memberName: submission.user?.name ?? submission.respondentName ?? "Anonymous guest",
          memberEmail: submission.user?.email ?? (typeof visitorEmail?.value === "string" ? visitorEmail.value : ""),
          respondentType: submission.user ? "Member" : "Guest",
          visitorDetails,
          submittedAt: formatDateTime(submission.submittedAt),
          submittedDate: formatDate(submission.submittedAt),
          submittedTime: formatTime(submission.submittedAt),
          score: submission.score,
          earnedPoints: submission.score === null ? null : totalEarnedPoints(submission.manualGrades) ?? 0,
          totalPoints: Math.round(totalPoints * 100) / 100,
          isReleased: submission.isReleased,
          releasedAt: submission.releasedAt ? formatDateTime(submission.releasedAt) : null,
          answers: visibleReviewQuestions.map((question) => ({
            questionIndex: question.index,
            question: question.label,
            type: question.type,
            points: Number.isFinite(question.points) && question.points > 0 ? question.points : 1,
            images: question.images,
            answer: answerText(answers[`question_${question.index}`]),
            correct: manualGradeFor(submission.manualGrades, question.index),
            earnedPoints: earnedPointsFor(submission.manualGrades, question.index),
          })),
        };
      })}
    />
  );
}
